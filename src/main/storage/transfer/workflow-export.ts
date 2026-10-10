import { createHash } from 'node:crypto';

import { workflowHeader } from '../../../shared/contracts/backup/workflow';
import { AssetRepository } from '../../attachments/repository';
import { QueueRepository } from '../../queue/repository';
import type { SnippetWrites } from '../../snippets/snippet-writes';
import { portableMemberships, portableSnippets, portableTags } from './snapshot-stream';

export function writeWorkflowExport(writes: SnippetWrites, write: (line: string) => void): void {
  const { context } = writes.reader,
    assets = new AssetRepository(context),
    queue = new QueueRepository(writes);

  write(`${JSON.stringify(workflowHeader)}\n`);
  const hash = createHash('sha256'),
    counts = {
      tags: 0,
      snippets: 0,
      memberships: 0,
      queue: 0,
      queueMemberships: 0,
      assets: 0,
      assetChunks: 0,
      attachments: 0
    };
  const record = (type: string, value: unknown) => {
    const line = `${JSON.stringify({ type, value })}\n`;

    hash.update(line);
    write(line);
  };

  for (const value of portableTags(context)) {
    record('tag', value);
    counts.tags++;
  }

  for (const value of portableSnippets(context, true)) {
    record('snippet', value);
    counts.snippets++;
  }

  for (const value of portableMemberships(context)) {
    record('membership', value);
    counts.memberships++;
  }

  for (const row of context.db.prepare('SELECT id FROM queue_items ORDER BY id').iterate()) {
    const { tags: _tags, attachments: _attachments, ...item } = queue.get(String(row['id']));

    record('queue', item);
    counts.queue++;
  }

  for (const value of context.db
    .prepare('SELECT itemId,tagId FROM queue_tags ORDER BY itemId,tagId')
    .iterate()) {
    record('queueMembership', value);
    counts.queueMemberships++;
  }

  const owned = context.db
    .prepare(
      `WITH RECURSIVE owned(id) AS (SELECT assetId FROM content_assets UNION
    SELECT backgroundId FROM assets JOIN owned ON assets.id=owned.id WHERE backgroundId IS NOT NULL) SELECT id FROM owned ORDER BY id`
    )
    .all();

  for (const row of owned) {
    const value = assets.read(String(row['id']));

    record('asset', { attachment: value.attachment, scene: value.scene });
    counts.assets++;
  }

  for (const row of owned) {
    const { bytes } = assets.read(String(row['id']));

    for (let offset = 0, index = 0; offset < bytes.byteLength; offset += 65536, index++) {
      record('assetChunk', {
        id: String(row['id']),
        index,
        data: Buffer.from(bytes.subarray(offset, offset + 65536)).toString('base64')
      });
      counts.assetChunks++;
    }
  }

  for (const value of context.db
    .prepare(
      'SELECT ownerKind AS kind,ownerId AS id,position,assetId FROM content_assets ORDER BY ownerKind,ownerId,position'
    )
    .iterate()) {
    record('attachment', value);
    counts.attachments++;
  }

  write(`${JSON.stringify({ type: 'end', ...counts, sha256: hash.digest('hex') })}\n`);
}
