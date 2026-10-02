import { expect, it } from 'vitest';

import { allSnippets } from './storage-test-fixture';
import { transferStore } from './transfer/transfer-test-fixture';

it('round-trips an edited tagged library through duplicate, undo, backup and database reopen', () => {
  const store = transferStore();
  const text = 'Full text\0雪🙂\r\n' + 'unchopped '.repeat(30);

  try {
    const original = store.invoke('createSnippet', { text: 'Draft' }).snippet;
    const tag = store.invoke('createTag', { name: 'work' }).tag;

    store.invoke('setSnippetTags', { id: original.id, tagIds: [tag.id] });
    store.invoke('updateSnippet', { id: original.id, text });
    const duplicate = store.invoke('duplicateSnippet', { id: original.id }).snippet;
    const deleted = store.invoke('deleteSnippet', { id: original.id });

    expect(store.invoke('searchSnippets', allSnippets).items.map((item) => item.id)).toEqual([
      duplicate.id
    ]);
    store.invoke('undoDeleteSnippet', { undoToken: deleted.undoToken });
    const backup = store.export();

    expect(backup.snippets).toHaveLength(2);
    expect(backup.snippets.every((snippet) => snippet.text === text)).toBe(true);
    expect(backup.tags.map((item) => item.name)).toEqual(['work']);
    expect(backup.memberships).toEqual(
      expect.arrayContaining([
        { snippetId: original.id, tagId: tag.id },
        { snippetId: duplicate.id, tagId: tag.id }
      ])
    );
    expect(
      Buffer.from(store.invoke('exportLibraryData', { format: 'markdown' }).data).toString('utf8')
    ).toContain(text);
    store.invoke('clearLibrary', {});
    expect(store.invoke('searchSnippets', allSnippets).items).toEqual([]);
    const preview = store.prepare(backup);

    store.invoke('commitLibraryImport', { token: preview.token, revision: preview.revision });
    store.reopen();
    expect(store.export()).toEqual(backup);
    expect(store.invoke('getSnippet', { id: original.id }).snippet.text).toBe(text);
    expect(store.invoke('searchSnippets', { ...allSnippets, tagIds: [tag.id] }).items).toHaveLength(
      2
    );
  } finally {
    store.dispose();
  }
});
