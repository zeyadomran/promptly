import { backupSchema } from '../../../shared/contracts/backup/format';
import type { StorageContext } from '../context';
import { decodeSnippetText, decodeSqlText, tagColumns } from '../sql-text';

/** One synchronous worker turn observes one coherent revision; no renderer pagination. */
export function portableSnapshot(context: StorageContext) {
  const snippets = context.db
    .prepare(
      'SELECT id, CAST(text AS BLOB) AS text, textUtf16, createdAt, updatedAt, lastCopiedAt, copyCount FROM snippets ORDER BY id'
    )
    .all()
    .map((row) => ({
      ...row,
      text: decodeSnippetText(row['textUtf16'], row['text']),
      textUtf16: undefined
    }));
  const tags = context.db
    .prepare(`SELECT ${tagColumns} FROM tags ORDER BY tags.id`)
    .all()
    .map((row) => ({ ...row, name: decodeSqlText(row['name']) }));

  return backupSchema.parse({
    format: 'promptly-library',
    version: 1,
    snippets: snippets.map(({ textUtf16: _bytes, ...snippet }) => snippet),
    tags,
    memberships: context.db
      .prepare('SELECT snippetId, tagId FROM snippet_tags ORDER BY snippetId, rowid')
      .all()
  });
}
