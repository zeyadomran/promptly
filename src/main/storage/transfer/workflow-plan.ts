import { assetLimits } from '../../../shared/contracts/attachments';
import {
  portableQueueSchema,
  workflowAssetSchema
} from '../../../shared/contracts/backup/workflow';
import { AssetRepository } from '../../attachments/repository';
import type { StorageContext } from '../context';
import { StorageError } from '../context';
import { decodeSnippetText } from '../sql-text';
import type { ImportStage } from './import-stage';
import { conflictId } from './library-identity';

export function planWorkflowAssets(context: StorageContext, stage: ImportStage): void {
  const planned = new Set<string>();
  const visit = (id: string): string => {
    const row = stage.db.prepare('SELECT json,target FROM workflow_assets WHERE id=?').get(id);

    if (row === undefined) throw new Error('Missing staged asset');
    if (planned.has(id)) return String(row['target']);
    const value = workflowAssetSchema.parse(JSON.parse(String(row['json'])));
    const background = value.scene?.backgroundAttachmentId;

    if (background !== undefined && value.scene !== null)
      value.scene.backgroundAttachmentId = visit(background);
    const { id: _id, ...metadata } = value.attachment;
    const identity = JSON.stringify([metadata, value.scene]);
    let target = id,
      attempt = 0,
      existing = context.db.prepare('SELECT json,scene FROM assets WHERE id=?').get(target);
    const same = () => {
      if (existing === undefined) return false;
      const { id: _storedId, ...stored } = JSON.parse(
        String(existing['json'])
      ) as typeof value.attachment;

      return (
        JSON.stringify([
          stored,
          existing['scene'] === null ? null : JSON.parse(String(existing['scene']))
        ]) === identity
      );
    };

    while (
      (existing !== undefined && !same()) ||
      stage.db
        .prepare('SELECT id FROM workflow_assets WHERE target=? AND id<>?')
        .get(target, id) !== undefined
    ) {
      target = conflictId(id, identity, attempt++);
      existing = context.db.prepare('SELECT json,scene FROM assets WHERE id=?').get(target);
    }

    value.attachment.id = target;
    stage.db
      .prepare('UPDATE workflow_assets SET target=?,fresh=?,json=? WHERE id=?')
      .run(target, same() ? 0 : 1, JSON.stringify(value), id);
    planned.add(id);
    return target;
  };

  for (const row of stage.db.prepare('SELECT id FROM workflow_assets ORDER BY id').all())
    visit(String(row['id']));
  const existingBytes = Number(
    context.db.prepare('SELECT COALESCE(SUM(length(data)),0) AS total FROM assets').get()?.['total']
  );
  const newBytes = Number(
    stage.db
      .prepare('SELECT COALESCE(SUM(length(data)),0) AS total FROM workflow_assets WHERE fresh=1')
      .get()?.['total']
  );

  if (existingBytes + newBytes > assetLimits.totalBytes)
    throw new StorageError(
      'UNAVAILABLE',
      'Import exceeds the managed attachment limit of 512 MiB.'
    );
}

export function stagedAssetIds(
  stage: ImportStage,
  kind: 'snippet' | 'queue',
  id: string
): string[] {
  return stage.db
    .prepare(
      'SELECT target FROM workflow_assets JOIN workflow_attachments ON workflow_assets.id=assetId WHERE kind=? AND ownerId=? ORDER BY position'
    )
    .all(kind, id)
    .map((row) => String(row['target']));
}

function queueIdentity(
  value: ReturnType<typeof portableQueueSchema.parse>,
  tags: string[],
  assets: string[]
): string {
  return JSON.stringify([
    value.text,
    value.createdAt,
    value.updatedAt,
    value.completedAt,
    [...tags].sort(),
    assets
  ]);
}

export function planWorkflowQueue(context: StorageContext, stage: ImportStage): void {
  for (const row of stage.db.prepare('SELECT id,json FROM workflow_queue ORDER BY id').all()) {
    const value = portableQueueSchema.parse(JSON.parse(String(row['json']))),
      id = value.id;
    const tags = stage.db
      .prepare('SELECT target FROM tags JOIN workflow_queue_tags ON tags.id=tagId WHERE itemId=?')
      .all(id)
      .map((tag) => String(tag['target']));
    const identity = queueIdentity(value, tags, stagedAssetIds(stage, 'queue', id));
    let target = id,
      attempt = 0;
    const stored = (candidate: string) => {
      const current = context.db
        .prepare('SELECT *,CAST(text AS BLOB) AS text FROM queue_items WHERE id=?')
        .get(candidate);

      if (current === undefined) return undefined;
      const tagIds = context.db
        .prepare('SELECT tagId FROM queue_tags WHERE itemId=?')
        .all(candidate)
        .map((tag) => String(tag['tagId']));

      return queueIdentity(
        {
          ...value,
          text: decodeSnippetText(current['textUtf16'], current['text']) ?? '',
          createdAt: String(current['createdAt']),
          updatedAt: String(current['updatedAt']),
          completedAt: current['completedAt'] === null ? null : String(current['completedAt'])
        },
        tagIds,
        new AssetRepository(context).list({ kind: 'queue', id: candidate }).map((asset) => asset.id)
      );
    };

    while (
      (stored(target) !== undefined && stored(target) !== identity) ||
      stage.db.prepare('SELECT id FROM workflow_queue WHERE target=? AND id<>?').get(target, id) !==
        undefined
    )
      target = conflictId(id, identity, attempt++);
    stage.db
      .prepare('UPDATE workflow_queue SET target=?,skip=? WHERE id=?')
      .run(target, stored(target) === identity ? 1 : 0, id);
  }

  const existing = Number(
    context.db.prepare('SELECT COUNT(*) AS count FROM queue_items').get()?.['count']
  );
  const additions = Number(
    stage.db.prepare('SELECT COUNT(*) AS count FROM workflow_queue WHERE skip=0').get()?.['count']
  );

  if (existing + additions > 2000)
    throw new StorageError('UNAVAILABLE', 'Import exceeds the queue limit of 2,000 prompts.');
}
