// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { allSnippets, testStorage } from '../storage/storage-test-fixture';

it('publishes settings revisions without reloading unchanged library entries', () => {
  const store = testStorage();

  try {
    const snippet = store.invoke('createSnippet', { text: 'still searchable' }).snippet;

    store.invoke('searchSnippets', { ...allSnippets, query: 'searchable' });
    const prepare = vi.spyOn(store.engine.context.db, 'prepare');

    store.invoke('updateSettings', { theme: 'dark' });
    const result = store.invoke('searchSnippets', { ...allSnippets, query: 'searchable' });

    expect(result.revision).toBe(2);
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe(snippet.id);
    expect(prepare.mock.calls.some(([sql]) => /FROM snippets\b/u.test(sql))).toBe(false);
    prepare.mockRestore();
  } finally {
    store.dispose();
  }
});
