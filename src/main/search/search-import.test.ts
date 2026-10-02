// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { allSnippets, testStorage } from '../storage/storage-test-fixture';
import { transferStore } from '../storage/transfer/transfer-test-fixture';

it('committed bulk import refreshes once, preserves exact UTF-16 and clear removes cached results', () => {
  const source = transferStore();
  const destination = transferStore();
  const text = 'needle\u0000😀\ud800';

  try {
    const first = source.invoke('createSnippet', { text }).snippet;
    const tag = source.invoke('createTag', { name: 'imported' }).tag;

    source.invoke('setSnippetTags', { id: first.id, tagIds: [tag.id] });
    for (let index = 0; index < 201; index += 1)
      source.invoke('createSnippet', { text: `bulk ${String(index)}` });
    expect(destination.invoke('searchSnippets', allSnippets).total).toBe(0);
    const plan = destination.prepare(source.export());

    destination.invoke('commitLibraryImport', { token: plan.token, revision: plan.revision });
    const prepare = vi.spyOn(destination.engine.context.db, 'prepare');
    const query = { ...allSnippets, query: `"${text}" tag:imported` };
    const result = destination.invoke('searchSnippets', query);

    expect(result.total).toBe(1);
    expect(result.items[0]?.text).toBe(text);
    expect(result.matches?.[first.id]).toEqual([{ start: 0, end: text.length }]);
    expect(destination.invoke('searchSnippets', query).total).toBe(1);
    expect(prepare.mock.calls.filter(([sql]) => sql.endsWith('FROM snippets'))).toHaveLength(1);
    prepare.mockRestore();
    destination.invoke('clearLibrary', {});
    expect(destination.invoke('searchSnippets', allSnippets)).toMatchObject({
      total: 0,
      items: [],
      matches: {},
      hasMore: false
    });
  } finally {
    source.dispose();
    destination.dispose();
  }
});

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
