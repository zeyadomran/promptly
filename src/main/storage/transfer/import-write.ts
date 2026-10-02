import type { SnippetWrites } from '../../snippets/snippet-writes';
import type { ImportPlan } from './import-plan';

/** Called only by the worker's existing transaction wrapper after revision validation. */
export function writeImport(writes: SnippetWrites, plan: ImportPlan) {
  const memberships = new Map<string, Set<string>>();
  const { context } = writes.reader;

  for (const tag of plan.backup.tags) {
    if (plan.newTags.has(tag.id))
      context.db
        .prepare('INSERT INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)')
        .run(plan.tagIds.get(tag.id) ?? tag.id, tag.name, tag.color, tag.createdAt);
  }

  for (const relationship of plan.backup.memberships) {
    const ids = memberships.get(relationship.snippetId) ?? new Set<string>();

    ids.add(plan.tagIds.get(relationship.tagId) ?? relationship.tagId);
    memberships.set(relationship.snippetId, ids);
  }

  for (const snippet of plan.backup.snippets) {
    writes.insert({
      ...snippet,
      id: plan.snippetIds.get(snippet.id) ?? snippet.id,
      sourceApp: null,
      sourceAppId: null,
      tags: []
    });
    for (const tag of memberships.get(snippet.id) ?? [])
      context.db
        .prepare('INSERT OR IGNORE INTO snippet_tags VALUES (?, ?)')
        .run(plan.snippetIds.get(snippet.id) ?? snippet.id, tag);
  }

  return { revision: context.revision() };
}
