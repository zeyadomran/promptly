// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { allSnippets, testStorage } from '../storage/storage-test-fixture';

describe('worker substring library', () => {
  let store: ReturnType<typeof testStorage>;

  beforeEach(() => {
    store = testStorage();
  });
  afterEach(() => {
    store.dispose();
  });

  function search(query: string, overrides = {}) {
    return store.invoke('searchSnippets', { ...allSnippets, query, ...overrides });
  }

  it('preserves literal wildcard/FTS/SQL-shaped text, short terms, Unicode and NUL suffixes', () => {
    const text = "👋İΣ 𐐀 你好 a%b_c (x)* prefix\u0000END Robert'); DROP TABLE snippets;--";

    store.invoke('createSnippet', { text });
    for (const query of [
      '👋',
      'i',
      'σ',
      '𐐨',
      '你好',
      'a%',
      '%',
      '_',
      '(x)*',
      '\u0000end',
      '"DROP TABLE"'
    ])
      expect(search(query).items[0]?.text, query).toBe(text);
    expect(search('missing').total).toBe(0);
    const page = search('i');

    expect(page.matches?.[page.items[0]?.id ?? '']).toContainEqual({ start: 2, end: 3 });
    store.reopen();
    expect(search('\u0000end').items[0]?.text).toBe(text);
  });

  it('intersects AND tag IDs, exact tag names, text and source name/identifier; reset and Untagged', () => {
    const a = store.invoke('createTag', { name: 'code review' }).tag;
    const b = store.invoke('createTag', { name: 'testing' }).tag;
    const captured = store.invoke('captureSnippet', {
      text: 'flaky test case',
      sourceApp: 'Windows Terminal',
      sourceAppId: 'terminal.exe'
    });

    if (captured.status === 'empty') throw new Error('Expected snippet.');
    store.invoke('setSnippetTags', { id: captured.snippet.id, tagIds: [a.id, b.id] });
    store.invoke('createSnippet', { text: 'flaky test case' });
    expect(
      search('tag:"CODE REVIEW" tag:testing from:TERMINAL.EXE flaky "test case"', {
        tagIds: [a.id]
      }).total
    ).toBe(1);
    expect(search('tag:review').total).toBe(0);
    expect(search('from:terminal flaky', { untagged: true }).total).toBe(0);
    expect(search('', { untagged: true }).total).toBe(1);
    expect(search('', { untagged: true, tagIds: [a.id] }).total).toBe(0);
    expect(search('').total).toBe(2);
  });

  it('refreshes committed changes, failed writes, tag rename/delete/merge, undo and clear', () => {
    const snippet = store.invoke('createSnippet', { text: 'before' }).snippet;
    const tag = store.invoke('createTag', { name: 'original' }).tag;
    const target = store.invoke('createTag', { name: 'target' }).tag;

    expect(search('before').total).toBe(1);
    store.invoke('updateSnippet', { id: snippet.id, text: 'after' });
    expect(search('before').total).toBe(0);
    expect(search('after').total).toBe(1);
    store.invoke('setSnippetTags', { id: snippet.id, tagIds: [tag.id] });
    expect(search('tag:original').total).toBe(1);
    store.invoke('updateTag', { id: tag.id, name: 'renamed', color: 'red' });
    expect(search('tag:original').total).toBe(0);
    expect(search('tag:renamed').items[0]?.tags[0]?.color).toBe('red');
    store.invoke('mergeTags', { sourceId: tag.id, targetId: target.id });
    expect(search('tag:target').total).toBe(1);
    store.invoke('deleteTag', { id: target.id });
    expect(search('', { untagged: true }).total).toBe(1);
    store.engine.context.db.exec(
      `CREATE TRIGGER reject_update BEFORE UPDATE ON snippets BEGIN SELECT RAISE(ABORT, 'no'); END;`
    );
    expect(
      store.engine.run(1, 'updateSnippet', { id: snippet.id, text: 'rejected' }).result.ok
    ).toBe(false);
    expect(search('after').total).toBe(1);
    expect(search('rejected').total).toBe(0);
    const deleted = store.invoke('deleteSnippet', { id: snippet.id });

    expect(search('after').total).toBe(0);
    store.invoke('undoDeleteSnippet', { undoToken: deleted.undoToken });
    expect(search('after').total).toBe(1);
    store.invoke('clearLibrary', {});
    expect(search('').total).toBe(0);
  });

  it('keeps transactional batch imports and settings-only revisions coherent', () => {
    expect(search('').total).toBe(0);
    store.engine.context.transaction(() => {
      for (let index = 0; index < 250; index += 1) {
        // Future import paths use the same transactional repository write boundary.
        const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

        store.engine.context.db
          .prepare('INSERT INTO snippets VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, 0)')
          .run(
            id,
            `import ${String(index)}`,
            'hash',
            '2026-10-02T00:00:00.000Z',
            '2026-10-02T00:00:00.000Z'
          );
      }
    });
    expect(search('import').total).toBe(250);
    expect(search('import', { offset: 200 }).hasMore).toBe(false);
    expect(() =>
      store.engine.context.transaction(() => {
        store.engine.context.db.exec('DELETE FROM snippets');
        throw new Error('rollback');
      })
    ).toThrow('rollback');
    expect(search('import').total).toBe(250);
    store.engine.context.transaction(() => {
      store.engine.context.db.prepare('INSERT INTO settings VALUES (?, ?)').run('test', 'true');
    });
    expect(search('import').revision).toBe(2);
    expect(
      store.engine.context.db.prepare('SELECT COUNT(*) AS n FROM search_dirty').get()?.['n']
    ).toBe(0);
  });

  it('applies all stable sorts, null-last copies, exact counts and page boundaries', () => {
    const a = store.invoke('createSnippet', { text: 'match a' }).snippet;
    const b = store.invoke('createSnippet', { text: 'match b' }).snippet;
    const c = store.invoke('createSnippet', { text: 'match c' }).snippet;

    store.engine.context.transaction(() => {
      const update = store.engine.context.db.prepare(
        'UPDATE snippets SET createdAt = ?, updatedAt = ?, copyCount = ?, lastCopiedAt = ? WHERE id = ?'
      );

      update.run('2026-01-01T00:00:00.000Z', '2026-03-03T00:00:00.000Z', 1, null, a.id);
      update.run(
        '2026-02-02T00:00:00.000Z',
        '2026-02-02T00:00:00.000Z',
        3,
        '2026-02-02T00:00:00.000Z',
        b.id
      );
      update.run(
        '2026-03-03T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
        3,
        '2026-03-03T00:00:00.000Z',
        c.id
      );
    });
    expect(search('match', { sort: 'newest' }).items.map((item) => item.id)).toEqual([
      a.id,
      b.id,
      c.id
    ]);
    expect(search('match', { sort: 'oldest' }).items.map((item) => item.id)).toEqual([
      a.id,
      b.id,
      c.id
    ]);
    expect(search('match', { sort: 'most-copied' }).items.map((item) => item.id)).toEqual(
      [b.id, c.id].sort().concat(a.id)
    );
    expect(search('match', { sort: 'recently-copied' }).items.map((item) => item.id)).toEqual([
      c.id,
      b.id,
      a.id
    ]);
    expect(search('match', { offset: 1, limit: 1 })).toMatchObject({
      total: 3,
      offset: 1,
      hasMore: true,
      items: [{ id: b.id }]
    });
    expect(search('match', { offset: 3 })).toMatchObject({ total: 3, hasMore: false, items: [] });
  });
});
