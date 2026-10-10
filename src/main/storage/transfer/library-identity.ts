import { createHash } from 'node:crypto';

import type { portableSnippetSchema } from '../../../shared/contracts/backup/format';
import type { StorageContext } from '../context';
import { decodeSnippetText } from '../sql-text';
import { portableSnippets, portableTags } from './snapshot-stream';

type PortableSnippet = ReturnType<typeof portableSnippetSchema.parse>;

export function snippetIdentity(
  snippet: Pick<PortableSnippet, 'text' | 'createdAt' | 'updatedAt'>,
  tags: string[],
  assets: string[] = []
) {
  return JSON.stringify([
    snippet.text,
    snippet.createdAt,
    snippet.updatedAt,
    [...tags].sort(),
    assets
  ]);
}

export function storedIdentity(context: StorageContext, id: string): string | undefined {
  const row = context.db
    .prepare(
      'SELECT CAST(text AS BLOB) AS text,textUtf16,createdAt,updatedAt FROM snippets WHERE id = ?'
    )
    .get(id);

  if (row === undefined) return undefined;
  const tags = context.db
    .prepare('SELECT tagId FROM snippet_tags WHERE snippetId = ?')
    .all(id)
    .map((tag) => String(tag['tagId']));

  return snippetIdentity(
    {
      text: String(decodeSnippetText(row['textUtf16'], row['text'])),
      createdAt: String(row['createdAt']),
      updatedAt: String(row['updatedAt'])
    },
    tags,
    context.db
      .prepare(
        "SELECT assetId FROM content_assets WHERE ownerKind='snippet' AND ownerId=? ORDER BY position"
      )
      .all(id)
      .map((asset) => String(asset['assetId']))
  );
}

/** Content/tag changes invalidate decisions; copies, preferences and window state do not. */
export function libraryIdentity(context: StorageContext): string {
  const hash = createHash('sha256');

  for (const tag of portableTags(context)) hash.update(`${JSON.stringify(['tag', tag])}\n`);
  for (const snippet of portableSnippets(context, true))
    hash.update(
      `${JSON.stringify(['snippet', snippet.id, snippet.text, snippet.createdAt, snippet.updatedAt])}\n`
    );
  for (const row of context.db
    .prepare('SELECT snippetId,tagId FROM snippet_tags ORDER BY snippetId,tagId')
    .iterate())
    hash.update(`${JSON.stringify(['membership', row])}\n`);
  for (const row of context.db
    .prepare(
      'SELECT ownerKind,ownerId,position,assetId FROM content_assets ORDER BY ownerKind,ownerId,position'
    )
    .iterate())
    hash.update(JSON.stringify(row));
  for (const row of context.db.prepare('SELECT id,json,scene FROM assets ORDER BY id').iterate())
    hash.update(JSON.stringify(row));
  for (const row of context.db
    .prepare(
      'SELECT id,CAST(text AS BLOB) AS text,textUtf16,createdAt,updatedAt,completedAt,position FROM queue_items ORDER BY id'
    )
    .iterate())
    hash.update(JSON.stringify({ ...row, text: decodeSnippetText(row['textUtf16'], row['text']) }));
  for (const row of context.db
    .prepare('SELECT itemId,tagId FROM queue_tags ORDER BY itemId,tagId')
    .iterate())
    hash.update(JSON.stringify(row));
  return hash.digest('hex');
}

/** Stable conflict IDs make reimporting the same preserved version idempotent. */
export function conflictId(id: string, identity: string, attempt: number): string {
  const bytes = createHash('sha256')
    .update(JSON.stringify([id, identity, attempt]))
    .digest();

  const hex = bytes.subarray(0, 16).toString('hex');
  const variant = (8 + (Number.parseInt(hex.slice(16, 17), 16) % 4)).toString(16);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20)}`;
}
