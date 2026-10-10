import { expect, it } from 'vitest';

import { allSnippets, testStorage } from '../storage/storage-test-fixture';

it('keeps an ordered queue independent from reusable snippets through completion undo, delete undo and reopen', () => {
  const store = testStorage();

  try {
    const first = store.invoke('createQueueItem', { text: 'First' }).item;
    const second = store.invoke('createQueueItem', { text: 'Second' }).item;
    const third = store.invoke('createQueueItem', { text: 'Third' }).item;

    store.invoke('reorderQueueItems', { ids: [third.id, first.id, second.id] });
    const done = store.invoke('setQueueItemCompleted', { id: first.id, completed: true });

    expect(store.invoke('listQueue', {}).openCount).toBe(2);
    store.invoke('undoQueueCompletion', { undoToken: done.undoToken });
    expect(store.invoke('listQueue', {}).items.map((item) => item.id)).toEqual([
      third.id,
      first.id,
      second.id
    ]);
    const snippet = store.invoke('saveQueueItemToLibrary', { id: first.id }).snippet;

    expect(store.invoke('getQueueItem', { id: first.id }).item.completedAt).toBeNull();
    const added = store.invoke('addSnippetToQueue', { id: snippet.id }).item;

    expect(store.invoke('searchSnippets', allSnippets).total).toBe(1);
    const deletion = store.invoke('deleteQueueItem', { id: second.id });

    store.invoke('undoDeleteQueueItem', { undoToken: deletion.undoToken });
    const whitespace =
      '\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

    store.invoke('updateQueueItem', { id: added.id, text: whitespace.repeat(60) + 'tail' });
    expect(store.invoke('listQueue', {}).items.find((item) => item.id === added.id)).toMatchObject({
      hasText: true
    });
    store.invoke('updateQueueItem', { id: added.id, text: '\0' });
    expect(store.invoke('listQueue', {}).items.find((item) => item.id === added.id)?.hasText).toBe(
      true
    );
    const draft = store.invoke('beginAssetDraft', {});

    store.invoke('storeDraftAttachment', {
      draftToken: draft.token,
      name: 'data.bin',
      kind: 'file',
      mimeType: 'application/octet-stream',
      bytes: new Uint8Array([1]),
      width: null,
      height: null
    });
    const attachmentOnly = store.invoke('createQueueItem', {
      text: whitespace,
      draftToken: draft.token
    }).item;

    expect(
      store.invoke('listQueue', {}).items.find((item) => item.id === attachmentOnly.id)?.hasText
    ).toBe(false);
    store.invoke('deleteQueueItem', { id: attachmentOnly.id });
    const longText = 'x'.repeat(1023) + String.fromCodePoint(0x1f642) + 'tail'.repeat(300);

    store.invoke('updateQueueItem', { id: added.id, text: longText });
    expect(store.invoke('listQueue', {}).items.find((item) => item.id === added.id)?.text).toBe(
      'x'.repeat(1023)
    );
    store.reopen();
    expect(store.invoke('getSnippet', { id: snippet.id }).snippet.text).toBe('First');
    expect(store.invoke('getQueueItem', { id: added.id }).item.text).toBe(longText);
    expect(store.invoke('listQueue', {}).items.map((item) => item.id)).toEqual([
      third.id,
      first.id,
      second.id,
      added.id
    ]);
    expect(
      store.engine.run(1, 'reorderQueueItems', { ids: [first.id, first.id] }).result
    ).toMatchObject({ ok: false });
    expect(store.invoke('listQueue', {}).openCount).toBe(4);
  } finally {
    store.dispose();
  }
});
