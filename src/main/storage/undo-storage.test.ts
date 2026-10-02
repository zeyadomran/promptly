// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { allSnippets, testStorage } from './storage-test-fixture';
import { UndoCache } from './undo-cache';

describe('bounded main-owned delete snapshots', () => {
  let store: ReturnType<typeof testStorage>;
  let time: Date;

  beforeEach(() => {
    time = new Date('2026-10-02T00:00:00.000Z');
    store = testStorage(() => time);
  });
  afterEach(() => {
    store.dispose();
  });

  it('restores the exact snippet and statistics once, using opaque tokens', () => {
    const id = store.invoke('createSnippet', { text: 'restore me' }).snippet.id;
    const tag = store.invoke('createTag', { name: 'tag' }).tag;

    store.invoke('setSnippetTags', { id, tagIds: [tag.id] });
    store.invoke('recordSuccessfulCopy', { id });
    const before = store.invoke('getSnippet', { id }).snippet;
    const deleted = store.invoke('deleteSnippet', { id });

    expect(deleted.undoToken).not.toBe(id);
    expect(store.invoke('listTags', {}).tags[0]?.snippetCount).toBe(0);
    expect(store.invoke('undoDeleteSnippet', { undoToken: deleted.undoToken }).snippet).toEqual(
      before
    );
    expect(
      store.engine.run(1, 'undoDeleteSnippet', { undoToken: deleted.undoToken }).result
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(
      store.engine.run(1, 'undoDeleteSnippet', { undoToken: randomUUID() }).result
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('expires tokens at 30 seconds and does not persist them after relaunch', () => {
    const id = store.invoke('createSnippet', { text: 'expires' }).snippet.id;
    const deleted = store.invoke('deleteSnippet', { id });

    time = new Date(time.getTime() + 30_000);
    expect(
      store.engine.run(1, 'undoDeleteSnippet', { undoToken: deleted.undoToken }).result
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    const other = store.invoke('createSnippet', { text: 'relaunch' }).snippet.id;
    const second = store.invoke('deleteSnippet', { id: other });

    store.reopen();
    expect(
      store.engine.run(1, 'undoDeleteSnippet', { undoToken: second.undoToken }).result
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('bounds snapshot count and byte size', () => {
    const snippet = store.invoke('createSnippet', { text: 'small' }).snippet;
    const cache = new UndoCache(2, 1024);

    cache.save('a', snippet, 0);
    cache.save('b', snippet, 0);
    cache.save('c', snippet, 0);
    expect(cache.get('a', 1)).toBeUndefined();
    expect(cache.get('b', 1)).toEqual(snippet);
    cache.save('too-large', { ...snippet, text: 'x'.repeat(2000) }, 0);
    expect(cache.get('too-large', 1)).toBeUndefined();
    const bytes = new UndoCache(100, 400);

    bytes.save('a', snippet, 0);
    bytes.save('b', snippet, 0);
    expect(bytes.get('a', 1)).toBeUndefined();
    expect(bytes.get('b', 1)).toEqual(snippet);
  });

  it('returns conflicts if tags vanished and keeps failed restoration atomic', () => {
    const id = store.invoke('createSnippet', { text: 'restore' }).snippet.id;
    const tag = store.invoke('createTag', { name: 'tag' }).tag;

    store.invoke('setSnippetTags', { id, tagIds: [tag.id] });
    const deleted = store.invoke('deleteSnippet', { id });

    store.invoke('deleteTag', { id: tag.id });
    const revision = store.engine.context.revision();
    const reply = store.engine.run(1, 'undoDeleteSnippet', { undoToken: deleted.undoToken });

    expect(reply.result).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(reply.change).toBeUndefined();
    expect(store.engine.context.revision()).toBe(revision);
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(0);
  });

  it('clears snippets, tags, and every token while preserving preferences', () => {
    const id = store.invoke('createSnippet', { text: 'clear' }).snippet.id;
    const token = store.invoke('deleteSnippet', { id }).undoToken;

    store.invoke('createSnippet', { text: 'another' });
    store.invoke('createTag', { name: 'gone' });
    store.engine.context.db.prepare('INSERT INTO settings VALUES (?, ?)').run('theme', 'dark');
    store.invoke('clearLibrary', {});
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(0);
    expect(store.invoke('listTags', {}).tags).toEqual([]);
    expect(store.engine.run(1, 'undoDeleteSnippet', { undoToken: token }).result).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' }
    });
    expect(
      store.engine.context.db.prepare('SELECT value FROM settings WHERE key = ?').get('theme')?.[
        'value'
      ]
    ).toBe('dark');
  });
});
