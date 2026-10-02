// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { allSnippets, testStorage } from './storage-test-fixture';

describe('transactional tags and list queries', () => {
  let store: ReturnType<typeof testStorage>;

  beforeEach(() => {
    store = testStorage(() => new Date('2026-10-02T00:00:00.000Z'));
  });
  afterEach(() => {
    store.dispose();
  });

  it('AND filters, untagged intersection, pagination, and ID ties are stable', () => {
    const first = store.invoke('createSnippet', { text: 'first' }).snippet;
    const second = store.invoke('createSnippet', { text: 'second' }).snippet;
    const third = store.invoke('createSnippet', { text: 'third' }).snippet;
    const a = store.invoke('createTag', { name: 'a' }).tag;
    const b = store.invoke('createTag', { name: 'b' }).tag;

    store.invoke('setSnippetTags', { id: first.id, tagIds: [a.id, b.id, a.id] });
    store.invoke('setSnippetTags', { id: second.id, tagIds: [a.id] });
    expect(store.invoke('searchSnippets', { ...allSnippets, tagIds: [a.id, b.id] }).items).toEqual([
      store.invoke('getSnippet', { id: first.id }).snippet
    ]);
    expect(store.invoke('searchSnippets', { ...allSnippets, untagged: true }).items).toEqual([
      third
    ]);
    expect(
      store.invoke('searchSnippets', { ...allSnippets, untagged: true, tagIds: [a.id] }).total
    ).toBe(0);
    const ids = [first.id, second.id, third.id].sort();

    for (const sort of ['newest', 'oldest', 'most-copied', 'recently-copied'] as const) {
      const firstPage = store.invoke('searchSnippets', { ...allSnippets, sort, limit: 1 });
      const nextPage = store.invoke('searchSnippets', {
        ...allSnippets,
        sort,
        limit: 1,
        offset: 1
      });

      expect(firstPage).toMatchObject({ total: 3, offset: 0, hasMore: true });
      expect(firstPage.items.map((snippet) => snippet.id)).toEqual(ids.slice(0, 1));
      expect(nextPage.items.map((snippet) => snippet.id)).toEqual(ids.slice(1, 2));
    }

    expect(store.invoke('searchSnippets', { ...allSnippets, offset: 3 })).toMatchObject({
      total: 3,
      items: [],
      hasMore: false
    });
    expect(
      store.engine.run(1, 'searchSnippets', { ...allSnippets, query: 'from:terminal text' }).result
    ).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
  });

  it('orders recapture by updatedAt, oldest by createdAt, and successful copy statistics', () => {
    let time = new Date('2026-10-02T00:00:00.000Z');

    store.dispose();
    store = testStorage(() => time);
    const first = store.invoke('createSnippet', { text: 'first' }).snippet;

    time = new Date(time.getTime() + 1000);
    const second = store.invoke('createSnippet', { text: 'second' }).snippet;

    time = new Date(time.getTime() + 1000);
    store.invoke('captureSnippet', { text: first.text, sourceApp: null, sourceAppId: null });
    expect(store.invoke('searchSnippets', allSnippets).items.map((snippet) => snippet.id)).toEqual([
      first.id,
      second.id
    ]);
    expect(
      store
        .invoke('searchSnippets', { ...allSnippets, sort: 'oldest' })
        .items.map((snippet) => snippet.id)
    ).toEqual([first.id, second.id]);
    store.invoke('recordSuccessfulCopy', { id: first.id });
    store.invoke('recordSuccessfulCopy', { id: first.id });
    time = new Date(time.getTime() + 1000);
    store.invoke('recordSuccessfulCopy', { id: second.id });
    expect(
      store
        .invoke('searchSnippets', { ...allSnippets, sort: 'most-copied' })
        .items.map((snippet) => snippet.id)
    ).toEqual([first.id, second.id]);
    expect(
      store
        .invoke('searchSnippets', { ...allSnippets, sort: 'recently-copied' })
        .items.map((snippet) => snippet.id)
    ).toEqual([second.id, first.id]);
  });

  it('rolls back relationship replacement and revision on missing tags or mid-write failure', () => {
    const snippet = store.invoke('createSnippet', { text: 'tagged' }).snippet;
    const existing = store.invoke('createTag', { name: 'existing' }).tag;
    const blocked = store.invoke('createTag', { name: 'blocked' }).tag;

    store.invoke('setSnippetTags', { id: snippet.id, tagIds: [existing.id] });
    const before = store.invoke('getSnippet', { id: snippet.id });

    expect(
      store.engine.run(1, 'setSnippetTags', { id: snippet.id, tagIds: [randomUUID()] }).result
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    store.engine.context.db.exec(`CREATE TRIGGER reject_relation BEFORE INSERT ON snippet_tags
      WHEN (SELECT name FROM tags WHERE id = NEW.tagId) = 'blocked'
      BEGIN SELECT RAISE(ABORT, 'relationship failure'); END;`);
    expect(
      store.engine.run(1, 'setSnippetTags', { id: snippet.id, tagIds: [existing.id, blocked.id] })
        .change
    ).toBeUndefined();
    expect(store.invoke('getSnippet', { id: snippet.id })).toEqual(before);
  });

  it('renames/recolors, rejects duplicate names, merges joins, and deletes tags without snippets', () => {
    const snippet = store.invoke('createSnippet', { text: 'tagged' }).snippet;
    const a = store.invoke('createTag', { name: 'a' }).tag;
    const b = store.invoke('createTag', { name: 'b' }).tag;

    expect(store.engine.run(1, 'createTag', { name: 'a' }).result).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' }
    });
    store.invoke('setSnippetTags', { id: snippet.id, tagIds: [a.id, b.id] });
    store.invoke('updateTag', { id: b.id, name: 'renamed', color: 'pink' });
    store.invoke('mergeTags', { sourceId: a.id, targetId: b.id });
    expect(store.invoke('listTags', {}).tags).toMatchObject([
      { id: b.id, name: 'renamed', color: 'pink', snippetCount: 1 }
    ]);
    expect(store.invoke('getSnippet', { id: snippet.id }).snippet.tags).toHaveLength(1);
    store.invoke('deleteTag', { id: b.id });
    expect(store.invoke('getSnippet', { id: snippet.id }).snippet.tags).toEqual([]);
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(1);
  });
});
