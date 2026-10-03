import { expect, it } from 'vitest';

import { allSnippets } from './storage-test-fixture';
import { transferStore } from './transfer/transfer-test-fixture';

// Hosted flow took 8.269s; this is an aggregate real-disk runner budget, not app latency.
it('round-trips an edited tagged library through duplicate, undo, backup and database reopen', () => {
  const store = transferStore();
  const text = 'Full text\0雪🙂\r\n' + 'unchopped '.repeat(30);

  try {
    const original = store.invoke('createSnippet', { text: 'Draft' }).snippet;
    const tag = store.invoke('createTag', { name: 'work', color: '#12abef' }).tag;

    expect(tag.color).toBe('#12abef');
    expect(
      store.engine.run(1, 'updateTag', { id: tag.id, name: 'work', color: '#bad' }).result
    ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(store.invoke('listTags', {}).tags[0]?.color).toBe('#12abef');

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
    expect(backup.tags[0]?.color).toBe('#12abef');
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
    expect(store.invoke('getSnippet', { id: original.id }).snippet.tags[0]?.color).toBe('#12abef');
    expect(store.invoke('searchSnippets', { ...allSnippets, tagIds: [tag.id] }).items).toHaveLength(
      2
    );
    const target = store.invoke('createTag', { name: 'archive', color: 'teal' }).tag;

    store.invoke('setTagMembership', { id: duplicate.id, tagId: target.id, assigned: true });
    const renamed = store.engine.run(2, 'updateTag', {
      id: tag.id,
      name: '  PROJECT  ',
      color: '  #A17BCD  '
    });

    expect(renamed).toMatchObject({
      result: { ok: true, value: { tag: { id: tag.id, name: 'project', color: '#a17bcd' } } },
      change: { domains: ['tags', 'snippets'] }
    });
    expect(store.invoke('getSnippet', { id: original.id }).snippet.tags).toEqual([
      expect.objectContaining({ id: tag.id, name: 'project', color: '#a17bcd' })
    ]);
    expect(() =>
      store.invoke('updateTag', { id: target.id, name: 'PROJECT', color: 'red' })
    ).toThrow('CONFLICT');
    expect(store.invoke('listTags', {}).tags).toEqual([
      expect.objectContaining({ id: target.id, name: 'archive', color: 'teal', snippetCount: 1 }),
      expect.objectContaining({ id: tag.id, name: 'project', color: '#a17bcd', snippetCount: 2 })
    ]);
    const beforeMerge = store.export();

    // Inject only the external SQLite write failure; observe atomicity through the public export.
    store.engine.context.db.exec(`CREATE TRIGGER reject_tag_merge BEFORE DELETE ON tags
      BEGIN SELECT RAISE(ABORT, 'owned write failure'); END;`);
    expect(() => store.invoke('mergeTags', { sourceId: tag.id, targetId: target.id })).toThrow(
      'CONFLICT'
    );
    expect(store.export()).toEqual(beforeMerge);
    store.engine.context.db.exec('DROP TRIGGER reject_tag_merge');
    store.invoke('mergeTags', { sourceId: tag.id, targetId: target.id });
    expect(store.invoke('listTags', {}).tags).toEqual([
      expect.objectContaining({ id: target.id, name: 'archive', color: 'teal', snippetCount: 2 })
    ]);
    for (const id of [original.id, duplicate.id])
      expect(store.invoke('getSnippet', { id }).snippet).toMatchObject({
        text,
        tags: [{ id: target.id, color: 'teal' }]
      });
    store.invoke('deleteTag', { id: target.id });
    store.reopen();
    expect(store.invoke('listTags', {}).tags).toEqual([]);
    for (const id of [original.id, duplicate.id])
      expect(store.invoke('getSnippet', { id }).snippet).toMatchObject({ id, text, tags: [] });
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(2);
  } finally {
    store.dispose();
  }
}, 15_000);
