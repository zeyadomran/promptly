import type { SnippetWrites } from '../../snippets/snippet-writes';
import type { ImportPlan } from './import-plan';

/** Only the worker transaction writes the immutable, previously reviewed stage. */
export function writeImport(writes: SnippetWrites, plan: ImportPlan) {
  const { context } = writes.reader;

  for (const tag of plan.stage.tags()) {
    const mapping = plan.stage.db.prepare('SELECT target,fresh FROM tags WHERE id = ?').get(tag.id);

    if (mapping === undefined) throw new Error('Missing reviewed tag');

    if (mapping['fresh'] === 1)
      context.db
        .prepare('INSERT INTO tags(id,name,color,createdAt) VALUES(?,?,?,?)')
        .run(String(mapping['target']), tag.name, tag.color, tag.createdAt);
  }

  for (const snippet of plan.stage.snippets()) {
    const mapping = plan.stage.db
      .prepare('SELECT target,skip FROM snippets WHERE id = ?')
      .get(snippet.id);

    if (mapping === undefined) throw new Error('Missing reviewed snippet');

    if (mapping['skip'] === 1) continue;
    const id = String(mapping['target']);

    writes.insert({ ...snippet, id, sourceApp: null, sourceAppId: null, tags: [] });
    for (const tag of plan.stage.db
      .prepare(
        'SELECT DISTINCT target FROM tags JOIN memberships ON tags.id = tagId WHERE snippetId = ?'
      )
      .all(snippet.id))
      context.db.prepare('INSERT INTO snippet_tags VALUES(?,?)').run(id, String(tag['target']));
  }

  return { revision: context.revision() };
}
