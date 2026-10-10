import { randomUUID } from 'node:crypto';

import type { ImportPreview } from '../../../shared/contracts/backup/operations';
import type { StorageContext } from '../context';
import type { ImportStage } from './import-stage';
import { conflictId, libraryIdentity, snippetIdentity, storedIdentity } from './library-identity';
import { planWorkflowAssets, planWorkflowQueue, stagedAssetIds } from './workflow-plan';

export interface ImportPlan {
  stage: ImportStage;
  identity: string;
  preview: ImportPreview;
  expires: number;
}

export function planImport(context: StorageContext, stage: ImportStage): ImportPlan {
  let remappedSnippetIds = 0;
  let remappedTagIds = 0;
  let coalescedTags = 0;
  let skippedSnippets = 0;

  stage.db.exec('BEGIN');
  for (const tag of stage.tags()) {
    const existing = context.db
      .prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
      .get(tag.name);
    const staged = stage.db
      .prepare(
        'SELECT target FROM tags WHERE name = ? COLLATE NOCASE AND target IS NOT NULL LIMIT 1'
      )
      .get(tag.name);
    const sameName = existing?.['id'] ?? staged?.['target'];
    let target = tag.id;

    if (sameName !== undefined) {
      target = String(sameName);
      if (target !== tag.id) coalescedTags++;
    } else {
      let attempt = 0;

      while (
        context.db.prepare('SELECT id FROM tags WHERE id = ?').get(target) !== undefined ||
        stage.db.prepare('SELECT id FROM tags WHERE target = ?').get(target) !== undefined ||
        stage.db.prepare('SELECT id FROM tags WHERE id = ? AND id <> ?').get(target, tag.id) !==
          undefined
      )
        target = conflictId(tag.id, JSON.stringify(tag), attempt++);
      if (target !== tag.id) remappedTagIds++;
    }

    stage.db
      .prepare('UPDATE tags SET target = ?,fresh = ? WHERE id = ?')
      .run(target, sameName === undefined ? 1 : 0, tag.id);
  }

  planWorkflowAssets(context, stage);
  for (const snippet of stage.snippets()) {
    const tags = stage.db
      .prepare(
        'SELECT DISTINCT target FROM tags JOIN memberships ON tags.id = tagId WHERE snippetId = ?'
      )
      .all(snippet.id)
      .map((row) => String(row['target']));
    const identity = snippetIdentity(snippet, tags, stagedAssetIds(stage, 'snippet', snippet.id));
    let target = snippet.id;
    let attempt = 0;
    let existing = storedIdentity(context, target);

    while (
      (existing !== undefined && existing !== identity) ||
      stage.db.prepare('SELECT id FROM snippets WHERE target = ?').get(target) !== undefined ||
      stage.db
        .prepare('SELECT id FROM snippets WHERE id = ? AND id <> ?')
        .get(target, snippet.id) !== undefined
    ) {
      target = conflictId(snippet.id, identity, attempt++);
      existing = storedIdentity(context, target);
    }

    const skip = existing === identity;

    if (skip) skippedSnippets++;
    if (target !== snippet.id) remappedSnippetIds++;
    stage.db
      .prepare('UPDATE snippets SET target = ?,skip = ? WHERE id = ?')
      .run(target, skip ? 1 : 0, snippet.id);
  }

  planWorkflowQueue(context, stage);
  stage.db.exec('COMMIT');
  return {
    stage,
    identity: libraryIdentity(context),
    expires: context.now().getTime() + 5 * 60_000,
    preview: {
      token: randomUUID(),
      revision: context.revision(),
      snippets: stage.count('snippets'),
      tags: stage.count('tags'),
      memberships: stage.count('memberships'),
      remappedSnippetIds,
      remappedTagIds,
      coalescedTags,
      skippedSnippets,
      queueItems: Number(
        stage.db.prepare('SELECT COUNT(*) AS count FROM workflow_queue').get()?.['count']
      ),
      assets: Number(
        stage.db.prepare('SELECT COUNT(*) AS count FROM workflow_assets').get()?.['count']
      ),
      remappedQueueIds: Number(
        stage.db.prepare('SELECT COUNT(*) AS count FROM workflow_queue WHERE id<>target').get()?.[
          'count'
        ]
      ),
      remappedAssetIds: Number(
        stage.db.prepare('SELECT COUNT(*) AS count FROM workflow_assets WHERE id<>target').get()?.[
          'count'
        ]
      ),
      skippedQueueItems: Number(
        stage.db.prepare('SELECT COUNT(*) AS count FROM workflow_queue WHERE skip=1').get()?.[
          'count'
        ]
      ),
      skippedAssets: Number(
        stage.db.prepare('SELECT COUNT(*) AS count FROM workflow_assets WHERE fresh=0').get()?.[
          'count'
        ]
      )
    }
  };
}
