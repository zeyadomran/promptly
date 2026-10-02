// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { allSnippets, testStorage } from './storage-test-fixture';

describe('durable snippet storage', () => {
  let store: ReturnType<typeof testStorage>;
  let time: Date;

  beforeEach(() => {
    time = new Date('2026-10-02T05:00:00.000Z');
    store = testStorage(() => time);
  });
  afterEach(() => {
    store.dispose();
  });

  it('reopens full Unicode, multiline/long text, source identity, tags, and copy statistics', () => {
    const text = `你好 👋 مرحبا\nline two\n${'long\n'.repeat(100_000)}\u0000end`;
    const captured = store.invoke('captureSnippet', {
      text,
      sourceApp: 'Cursor',
      sourceAppId: 'Cursor.exe'
    });

    if (captured.status === 'empty') throw new Error('Expected saved capture.');
    const id = captured.snippet.id;
    const tag = store.invoke('createTag', { name: 'résumé' }).tag;

    store.invoke('setSnippetTags', { id, tagIds: [tag.id] });
    store.invoke('recordSuccessfulCopy', { id });
    const expected = store.invoke('getSnippet', { id });

    store.reopen();
    expect(store.invoke('getSnippet', { id })).toEqual(expected);
    expect(expected.snippet).toMatchObject({
      text,
      sourceAppId: 'Cursor.exe',
      tags: [tag],
      copyCount: 1,
      lastCopiedAt: time.toISOString()
    });
    expect(store.invoke('listTags', {}).tags).toEqual([{ ...tag, snippetCount: 1 }]);
  });

  it('recaptures deterministic original IDs and preserves createdAt/tags; explicit duplicates reset stats', () => {
    const captured = store.invoke('captureSnippet', {
      text: 'same text',
      sourceApp: 'Terminal',
      sourceAppId: 'com.apple.Terminal'
    });

    if (captured.status === 'empty') throw new Error('Expected saved capture.');
    const original = captured.snippet;
    const tag = store.invoke('createTag', { name: 'work', color: 'green' }).tag;

    store.invoke('setSnippetTags', { id: original.id, tagIds: [tag.id] });
    store.invoke('recordSuccessfulCopy', { id: original.id });
    time = new Date(time.getTime() + 1000);
    const duplicate = store.invoke('duplicateSnippet', { id: original.id }).snippet;

    expect(duplicate).toMatchObject({
      text: original.text,
      tags: [tag],
      copyCount: 0,
      lastCopiedAt: null
    });
    expect(duplicate.id).not.toBe(original.id);
    time = new Date(time.getTime() + 1000);
    const again = store.invoke('captureSnippet', {
      text: 'same text',
      sourceApp: 'New source',
      sourceAppId: null
    });

    expect(again).toMatchObject({
      status: 'duplicate',
      snippet: {
        id: original.id,
        createdAt: original.createdAt,
        updatedAt: time.toISOString(),
        tags: [tag],
        copyCount: 1,
        sourceApp: 'New source',
        sourceAppId: null
      }
    });
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(2);
  });

  it('matches raw exact text without trimming or normalization and ignores blank captures', () => {
    store.invoke('captureSnippet', { text: ' text ', sourceApp: null, sourceAppId: null });
    store.invoke('captureSnippet', { text: 'text', sourceApp: null, sourceAppId: null });
    const revision = store.engine.context.revision();

    expect(
      store.invoke('captureSnippet', { text: ' \n\t', sourceApp: null, sourceAppId: null })
    ).toEqual({ status: 'empty', revision });
    expect(store.engine.context.revision()).toBe(revision);
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(2);
  });

  it('retains provenance on edits and clears it for renderer-created snippets', () => {
    const snippet = store.invoke('createSnippet', { text: 'hello' }).snippet;
    const changed = store.invoke('updateSnippet', {
      id: snippet.id,
      text: `Robert'); DROP TABLE snippets;--`
    });

    expect(changed.snippet).toMatchObject({
      sourceApp: null,
      sourceAppId: null,
      text: `Robert'); DROP TABLE snippets;--`
    });
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(1);
    expect(store.engine.run(1, 'getSnippet', { id: randomUUID() }).result).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' }
    });
    expect(
      store.engine.run(1, 'createSnippet', { text: 'x', sourceApp: 'spoof' }).result
    ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  });

  it('keeps distinct NUL suffixes separate and compares full text even when hashes collide', () => {
    const a = store.invoke('createSnippet', { text: 'prefix\u0000a' }).snippet;
    const b = store.invoke('createSnippet', { text: 'prefix\u0000b' }).snippet;
    const hash = store.engine.context.db
      .prepare('SELECT textHash FROM snippets WHERE id = ?')
      .get(a.id)?.['textHash'];

    if (typeof hash !== 'string') throw new Error('Expected hash.');
    store.engine.context.db
      .prepare('UPDATE snippets SET textHash = ? WHERE id = ?')
      .run(hash, b.id);
    const again = store.invoke('captureSnippet', {
      text: a.text,
      sourceApp: null,
      sourceAppId: null
    });

    expect(again).toMatchObject({ status: 'duplicate', snippet: { id: a.id, text: a.text } });
    expect(store.invoke('getSnippet', { id: b.id }).snippet.text).toBe(b.text);
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(2);
  });

  it('publishes only committed revisions and rolls back copy statistics on failure', () => {
    const created = store.engine.run(1, 'createSnippet', { text: 'copy me' });
    const id = store.invoke('searchSnippets', allSnippets).items[0]?.id;

    if (id === undefined) throw new Error('Expected snippet.');
    expect(created.change).toEqual({ revision: 1, domains: ['snippets'] });
    store.engine.context.db.exec(
      `CREATE TRIGGER reject_copy BEFORE UPDATE OF copyCount ON snippets BEGIN SELECT RAISE(ABORT, 'copy failure'); END;`
    );
    expect(store.engine.run(1, 'recordSuccessfulCopy', { id })).toMatchObject({
      result: { ok: false }
    });
    expect(store.engine.run(1, 'recordSuccessfulCopy', { id }).change).toBeUndefined();
    expect(store.invoke('getSnippet', { id })).toMatchObject({
      revision: 1,
      snippet: { copyCount: 0, lastCopiedAt: null }
    });
  });
});
