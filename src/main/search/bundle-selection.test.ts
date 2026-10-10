// @vitest-environment node
import { expect, it } from 'vitest';

import { allSnippets } from '../storage/storage-test-fixture';
import { bundleSearchFixture } from './bundle-search-fixture';

it('matches only selected IDs against the full authoritative filter and keeps paged search current', () => {
  const store = bundleSearchFixture();

  try {
    const search = store.search;
    const tag = store.tag('code review');
    const first = store.create('x'.repeat(2_000) + ' İstanbul needle', 'Owned Terminal');
    const second = store.create('needle second').snippet;
    const third = store.create('elsewhere').snippet;

    store.setTags(first.snippet.id, [tag.id]);
    search.query(allSnippets); // Prime the sorted page before a selected-ID refresh.
    const filter = {
      ids: [third.id, first.snippet.id, second.id],
      query: 'tag:"CODE REVIEW" from:terminal "i̇stanbul" needle',
      tagIds: [tag.id],
      untagged: false
    };

    expect(search.matchSelected(filter).ids).toEqual([first.snippet.id]);
    expect(search.matchSelected({ ...filter, query: 'needle', tagIds: [] }).ids).toEqual([
      first.snippet.id,
      second.id
    ]);
    expect(search.matchSelected({ ...filter, query: '', tagIds: [], untagged: true }).ids).toEqual([
      third.id,
      second.id
    ]);
    store.delete(first.snippet.id);
    store.update(second.id, 'now elsewhere');
    expect(search.matchSelected({ ...filter, query: 'needle', tagIds: [] }).ids).toEqual([]);
    expect(search.query(allSnippets)).toMatchObject({ total: 2 });
    expect(search.query(allSnippets).items.map((item) => item.id)).not.toContain(first.snippet.id);
    store.reopen();
    const reopened = store.search;

    expect(reopened.matchSelected({ ...filter, query: 'elsewhere', tagIds: [] }).ids).toEqual([
      third.id,
      second.id
    ]);
  } finally {
    store.dispose();
  }
});
