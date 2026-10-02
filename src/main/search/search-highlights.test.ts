// @vitest-environment node
import { expect, it } from 'vitest';

import { allSnippets, testStorage } from '../storage/storage-test-fixture';

it('transports complete merged highlights for later terms and more than 512 distinct occurrences', () => {
  const store = testStorage();

  try {
    const text = `b ${'a '.repeat(700)}b`;
    const snippet = store.invoke('createSnippet', { text }).snippet;
    const result = store.invoke('searchSnippets', { ...allSnippets, query: 'a b' });
    const ranges = result.matches?.[snippet.id];

    expect(result.total).toBe(1);
    expect(ranges).toHaveLength(702);
    expect(ranges?.[0]).toEqual({ start: 0, end: 1 });
    expect(ranges?.at(-1)).toEqual({ start: text.length - 1, end: text.length });
  } finally {
    store.dispose();
  }
});
