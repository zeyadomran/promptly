import {
  portableQueueSchema,
  workflowAssetSchema
} from '../../../shared/contracts/backup/workflow';
import { AssetRepository } from '../../attachments/repository';
import type { SnippetWrites } from '../../snippets/snippet-writes';
import type { ImportStage } from './import-stage';

export function writeWorkflowAssets(writes: SnippetWrites, stage: ImportStage): void {
  const inserted = new Set<string>(),
    { context } = writes.reader;
  const visit = (id: string) => {
    if (inserted.has(id)) return;
    const row = stage.db.prepare('SELECT * FROM workflow_assets WHERE target=?').get(id);

    if (row === undefined) throw new Error('Missing reviewed asset');
    const value = workflowAssetSchema.parse(JSON.parse(String(row['json']))),
      background = value.scene?.backgroundAttachmentId;

    if (background !== undefined) visit(background);
    if (row['fresh'] === 1)
      context.db
        .prepare('INSERT INTO assets VALUES(?,?,?,?,?)')
        .run(
          id,
          JSON.stringify(value.attachment),
          row['data'] as Uint8Array,
          value.scene === null ? null : JSON.stringify(value.scene),
          background ?? null
        );
    inserted.add(id);
  };

  for (const row of stage.db.prepare('SELECT target FROM workflow_assets ORDER BY id').all())
    visit(String(row['target']));
}

export function stagedAttachments(
  writes: SnippetWrites,
  stage: ImportStage,
  kind: 'snippet' | 'queue',
  id: string
) {
  const assets = new AssetRepository(writes.reader.context);

  return stage.db
    .prepare(
      'SELECT target FROM workflow_assets JOIN workflow_attachments ON workflow_assets.id=assetId WHERE kind=? AND ownerId=? ORDER BY position'
    )
    .all(kind, id)
    .map((row) => assets.read(String(row['target'])).attachment);
}

export function writeWorkflowQueue(writes: SnippetWrites, stage: ImportStage): void {
  const { context } = writes.reader,
    assets = new AssetRepository(context);
  let position = Number(
    context.db
      .prepare('SELECT COUNT(*) AS count FROM queue_items WHERE completedAt IS NULL')
      .get()?.['count']
  );

  for (const row of stage.db
    .prepare(
      "SELECT id,json,target,skip FROM workflow_queue ORDER BY json_extract(json,'$.completedAt') IS NOT NULL,json_extract(json,'$.position'),id"
    )
    .all()) {
    if (row['skip'] === 1) continue;
    const value = portableQueueSchema.parse(JSON.parse(String(row['json']))),
      id = String(row['target']);

    context.db
      .prepare(
        'INSERT INTO queue_items(id,text,textUtf16,createdAt,updatedAt,completedAt,position,copyCount,lastCopiedAt) VALUES(?,?,?,?,?,?,?,?,?)'
      )
      .run(
        id,
        value.text,
        Buffer.from(value.text, 'utf16le'),
        value.createdAt,
        value.updatedAt,
        value.completedAt,
        value.completedAt === null ? position++ : value.position,
        value.copyCount,
        value.lastCopiedAt
      );
    for (const tag of stage.db
      .prepare('SELECT target FROM tags JOIN workflow_queue_tags ON tags.id=tagId WHERE itemId=?')
      .all(value.id))
      context.db.prepare('INSERT INTO queue_tags VALUES(?,?)').run(id, String(tag['target']));
    assets.replace({ kind: 'queue', id }, stagedAttachments(writes, stage, 'queue', value.id));
  }
}
