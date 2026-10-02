// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { expect, it } from 'vitest';

import { transferStore } from './transfer-test-fixture';

it('coalesces imported NUL names according to actual SQLite NOCASE and unions memberships', () => {
  const store = transferStore();

  try {
    const snippet = store.invoke('createSnippet', { text: 'tagged' }).snippet;
    const backup = store.export();

    backup.tags = ['a\u0000b', 'a\u0000c', 'a\u0000long'].map((name) => ({
      id: randomUUID(),
      name,
      color: 'blue',
      createdAt: snippet.createdAt
    }));
    backup.memberships = backup.tags.map((tag) => ({ snippetId: snippet.id, tagId: tag.id }));
    const preview = store.prepare(backup);

    expect(preview.coalescedTags).toBe(1);
    store.invoke('commitLibraryImport', { token: preview.token, revision: preview.revision });
    const imported = store.export();

    expect(imported.tags).toHaveLength(2);
    expect(imported.memberships).toHaveLength(2);
    expect(imported.tags.map((tag) => tag.name)).toEqual(
      expect.arrayContaining(['a\u0000b', 'a\u0000long'])
    );
  } finally {
    store.dispose();
  }
});
