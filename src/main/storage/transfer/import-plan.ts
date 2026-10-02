import { randomUUID } from 'node:crypto';

import type { PortableBackup } from '../../../shared/contracts/backup/format';
import type { ImportPreview } from '../../../shared/contracts/backup/operations';
import type { StorageContext } from '../context';

export interface ImportPlan {
  backup: PortableBackup;
  snippetIds: Map<string, string>;
  tagIds: Map<string, string>;
  newTags: Set<string>;
  preview: ImportPreview;
  expires: number;
}

export function planImport(context: StorageContext, backup: PortableBackup): ImportPlan {
  const snippetIds = new Map<string, string>();
  const tagIds = new Map<string, string>();
  const names = new Map<string, string>();
  const newTags = new Set<string>();
  const reservedTags = new Set<string>();
  const reservedSnippets = new Set<string>();
  let remappedSnippetIds = 0;
  let remappedTagIds = 0;
  let coalescedTags = 0;

  for (const snippet of backup.snippets) {
    const conflicting = context.db.prepare('SELECT id FROM snippets WHERE id = ?').get(snippet.id);
    let id = snippet.id;

    if (conflicting !== undefined || reservedSnippets.has(id)) {
      do {
        id = randomUUID();
      } while (
        reservedSnippets.has(id) ||
        context.db.prepare('SELECT id FROM snippets WHERE id = ?').get(id) !== undefined
      );

      remappedSnippetIds += 1;
    }

    reservedSnippets.add(id);
    snippetIds.set(snippet.id, id);
  }

  for (const tag of backup.tags) {
    const existing = context.db
      .prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
      .get(tag.name);
    const nameKey = tag.name.replace(/[A-Z]/gu, (letter) => letter.toLowerCase());
    const sameName = existing === undefined ? names.get(nameKey) : String(existing['id']);

    if (sameName !== undefined) {
      tagIds.set(tag.id, sameName);
      coalescedTags += 1;
      continue;
    }

    let id = tag.id;

    if (
      reservedTags.has(id) ||
      context.db.prepare('SELECT id FROM tags WHERE id = ?').get(id) !== undefined
    ) {
      do {
        id = randomUUID();
      } while (
        reservedTags.has(id) ||
        context.db.prepare('SELECT id FROM tags WHERE id = ?').get(id) !== undefined
      );

      remappedTagIds += 1;
    }

    tagIds.set(tag.id, id);
    names.set(nameKey, id);
    reservedTags.add(id);
    newTags.add(tag.id);
  }

  return {
    backup,
    snippetIds,
    tagIds,
    newTags,
    expires: context.now().getTime() + 5 * 60_000,
    preview: {
      token: randomUUID(),
      revision: context.revision(),
      snippets: backup.snippets.length,
      tags: backup.tags.length,
      memberships: backup.memberships.length,
      remappedSnippetIds,
      remappedTagIds,
      coalescedTags
    }
  };
}
