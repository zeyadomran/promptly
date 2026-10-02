// @vitest-environment node
import { expect, it } from 'vitest';

import { allSnippets, testStorage } from '../storage/storage-test-fixture';

it('future import-style relation UPDATE invalidates both old/new snippet memberships', () => {
  const store = testStorage();

  try {
    const first = store.invoke('createSnippet', { text: 'first' }).snippet;
    const second = store.invoke('createSnippet', { text: 'second' }).snippet;
    const tag = store.invoke('createTag', { name: 'imported' }).tag;

    store.invoke('setSnippetTags', { id: first.id, tagIds: [tag.id] });
    expect(
      store.invoke('searchSnippets', { ...allSnippets, query: 'tag:imported' }).items[0]?.id
    ).toBe(first.id);
    store.engine.context.transaction(() => {
      store.engine.context.db
        .prepare('UPDATE snippet_tags SET snippetId = ? WHERE snippetId = ?')
        .run(second.id, first.id);
    });
    expect(
      store.invoke('searchSnippets', { ...allSnippets, query: 'tag:imported' }).items[0]?.id
    ).toBe(second.id);
    expect(store.invoke('searchSnippets', { ...allSnippets, untagged: true }).items[0]?.id).toBe(
      first.id
    );
  } finally {
    store.dispose();
  }
});
