import { createHash } from 'node:crypto';

import { assetNameSchema } from '../../../shared/contracts/assets-worker';
import { workflowRecordSchema } from '../../../shared/contracts/backup/workflow';
import { imageHeader, isPng, previewable } from '../../attachments/image-header';
import type { ImportStage } from './import-stage';
export function verifyWorkflowStage(stage: ImportStage): void {
  const { db } = stage;

  for (const row of db.prepare('SELECT id,json FROM workflow_assets').iterate()) {
    const record = workflowRecordSchema.parse({
      type: 'asset',
      value: JSON.parse(String(row['json'])) as unknown
    });

    if (record.type !== 'asset') throw new Error('Invalid asset');
    const parts = db
      .prepare('SELECT sequence,data FROM workflow_chunks WHERE id=? ORDER BY sequence')
      .all(String(row['id']));

    if (parts.some((part, index) => part['sequence'] !== index))
      throw new Error('Incomplete chunks');
    const bytes = Buffer.concat(parts.map((part) => Buffer.from(part['data'] as Uint8Array)));
    const { attachment, scene } = record.value;

    assetNameSchema.parse(attachment.name);
    if (
      bytes.byteLength !== attachment.byteLength ||
      createHash('sha256').update(bytes).digest('hex') !== attachment.sha256
    )
      throw new Error('Damaged asset');
    if (
      attachment.kind !== 'file' &&
      (!previewable(imageHeader(bytes)) ||
        imageHeader(bytes)?.width !== attachment.width ||
        imageHeader(bytes)?.height !== attachment.height)
    )
      throw new Error('Unsafe image');
    if (
      attachment.hasScene !== (scene !== null) ||
      (attachment.kind === 'drawing') !== (scene !== null)
    )
      throw new Error('Invalid scene ownership');
    if (scene !== null && !isPng(bytes)) throw new Error('Drawing is not PNG');
    if (attachment.kind === 'file' && (attachment.width !== null || attachment.height !== null))
      throw new Error('Invalid file dimensions');
    if (scene !== null && (scene.width !== attachment.width || scene.height !== attachment.height))
      throw new Error('Scene dimensions disagree');
    const background = scene?.backgroundAttachmentId;

    if (
      background !== undefined &&
      db.prepare('SELECT id FROM workflow_assets WHERE id=?').get(background) === undefined
    )
      throw new Error('Missing background');
    if (background !== undefined) {
      const raw: unknown = JSON.parse(
        String(db.prepare('SELECT json FROM workflow_assets WHERE id=?').get(background)?.['json'])
      );
      const parent = workflowRecordSchema.parse({ type: 'asset', value: raw });

      if (parent.type !== 'asset' || parent.value.attachment.kind === 'file')
        throw new Error('Unsafe drawing background');
    }

    db.prepare('UPDATE workflow_assets SET data=? WHERE id=?').run(bytes, String(row['id']));
  }

  for (const row of db
    .prepare('SELECT kind,ownerId FROM workflow_attachments GROUP BY kind,ownerId')
    .iterate()) {
    const table = row['kind'] === 'snippet' ? 'snippets' : 'workflow_queue';

    if (db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(String(row['ownerId'])) === undefined)
      throw new Error('Missing attachment owner');
    const positions = db
      .prepare(
        'SELECT position FROM workflow_attachments WHERE kind=? AND ownerId=? ORDER BY position'
      )
      .all(String(row['kind']), String(row['ownerId']));

    if (positions.some((position, index) => position['position'] !== index))
      throw new Error('Invalid attachment order');
  }

  for (const table of ['snippets', 'workflow_queue'])
    for (const row of db.prepare(`SELECT id,json FROM ${table}`).iterate()) {
      const value = JSON.parse(String(row['json'])) as { text: string };

      if (
        value.text.trim() === '' &&
        db
          .prepare('SELECT assetId FROM workflow_attachments WHERE kind=? AND ownerId=?')
          .get(table === 'snippets' ? 'snippet' : 'queue', String(row['id'])) === undefined
      )
        throw new Error('Empty entry');
    }

  if (
    db
      .prepare('SELECT itemId FROM workflow_queue_tags GROUP BY itemId HAVING COUNT(*)>100')
      .get() !== undefined ||
    db.prepare('SELECT snippetId FROM memberships GROUP BY snippetId HAVING COUNT(*)>100').get() !==
      undefined
  )
    throw new Error('Too many tags');
  if (
    db
      .prepare(
        `WITH RECURSIVE reachable(id) AS (
    SELECT assetId FROM workflow_attachments
    UNION SELECT json_extract(json,'$.scene.backgroundAttachmentId') FROM workflow_assets JOIN reachable ON workflow_assets.id=reachable.id WHERE json_extract(json,'$.scene.backgroundAttachmentId') IS NOT NULL
  ) SELECT id FROM workflow_assets WHERE id NOT IN reachable LIMIT 1`
      )
      .get() !== undefined
  )
    throw new Error('Asset has no owner');
  // Background links must form a DAG; immutable drawing imports cannot introduce cycles.
  for (const row of db.prepare('SELECT id,json FROM workflow_assets').all()) {
    const seen = new Set<string>();
    let current: string | undefined = String(row['id']);

    while (current !== undefined) {
      if (seen.size >= 64) throw new Error('Background chain exceeds limit');
      if (seen.has(current)) throw new Error('Cyclic background');
      seen.add(current);
      const value = workflowRecordSchema.parse({
        type: 'asset',
        value: JSON.parse(
          String(db.prepare('SELECT json FROM workflow_assets WHERE id=?').get(current)?.['json'])
        ) as unknown
      });

      if (value.type !== 'asset') throw new Error('Invalid background');
      current = value.value.scene?.backgroundAttachmentId;
    }
  }
}
