import { randomUUID } from 'node:crypto';
import { statSync, truncateSync, writeFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { transferStore } from './transfer-test-fixture';

it('rejects invalid imports and atomically coalesces colliding tag memberships', () => {
  const store = transferStore();

  try {
    const baseline = store.export();

    expect(
      store.engine.run(1, 'prepareLibraryImport', { filename: `${store.file}.missing` }).result
    ).toMatchObject({
      ok: false,
      error: {
        code: 'UNAVAILABLE',
        message: 'The backup file is missing or unreadable. Choose an accessible file.'
      }
    });

    writeFileSync(
      store.file,
      JSON.stringify({
        ...baseline,
        memberships: [{ snippetId: randomUUID(), tagId: randomUUID() }]
      })
    );
    expect(
      store.engine.run(1, 'prepareLibraryImport', { filename: store.file }).result
    ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(store.export()).toEqual(baseline);
    const first = randomUUID();
    const second = randomUUID();
    const tagA = randomUUID();
    const tagB = randomUUID();
    const createdAt = '2026-10-02T00:00:00.000Z';
    const preview = store.prepare({
      ...baseline,
      snippets: [first, second].map((id) => ({
        id,
        text: 'duplicate',
        createdAt,
        updatedAt: createdAt,
        lastCopiedAt: null,
        copyCount: 0
      })),
      tags: [
        { id: tagA, name: 'a\u0000b', color: 'blue', createdAt },
        { id: tagB, name: 'a\u0000c', color: 'blue', createdAt }
      ],
      memberships: [
        { snippetId: first, tagId: tagA },
        { snippetId: second, tagId: tagB }
      ]
    });

    expect(preview).toMatchObject({ snippets: 2, tags: 2, coalescedTags: 1 });

    store.engine.context.db.exec(
      "CREATE TRIGGER reject_import BEFORE INSERT ON snippets WHEN (SELECT COUNT(*) FROM snippets) > 0 BEGIN SELECT RAISE(ABORT, 'owned failure'); END;"
    );
    expect(
      store.engine.run(1, 'commitLibraryImport', {
        token: preview.token,
        revision: preview.revision
      }).result.ok
    ).toBe(false);
    expect(store.export()).toEqual(baseline);
    store.engine.context.db.exec('DROP TRIGGER reject_import');
    store.invoke('commitLibraryImport', { token: preview.token, revision: preview.revision });
    const imported = store.export();

    expect(imported.snippets.map((snippet) => snippet.text)).toEqual(['duplicate', 'duplicate']);
    expect(imported.tags).toHaveLength(1);
    expect(imported.memberships).toHaveLength(2);
    expect(new Set(imported.memberships.map((item) => item.tagId)).size).toBe(1);
    const repeat = store.prepare(imported);

    expect(repeat.skippedSnippets).toBe(2);
    store.invoke('recordSuccessfulCopy', { id: first });
    store.invoke('updateSettings', {
      theme: 'dark',
      rememberedBounds: { compact: { x: 10, y: 20, width: 440, height: 400 }, regular: null }
    });
    // Confirmation uses the immutable captured stage, even if the chosen file changes.
    writeFileSync(store.file, 'changed after preview');
    store.invoke('commitLibraryImport', { token: repeat.token, revision: repeat.revision });
    expect(store.export().snippets).toHaveLength(2);
    expect(store.invoke('getSnippet', { id: first }).snippet.copyCount).toBe(1);
    expect(store.invoke('getSettings', {}).settings.theme).toBe('dark');
    const conflictBackup = {
      ...imported,
      snippets: imported.snippets.map((snippet) =>
        snippet.id === first ? { ...snippet, text: 'another version' } : snippet
      )
    };
    const conflict = store.prepare(conflictBackup);

    expect(conflict).toMatchObject({ remappedSnippetIds: 1, skippedSnippets: 1 });
    store.invoke('commitLibraryImport', { token: conflict.token, revision: conflict.revision });
    const preserved = store.export();
    const preservedVersion = preserved.snippets.find(
      (snippet) => snippet.text === 'another version'
    );

    expect(preserved.snippets).toHaveLength(3);
    expect(preservedVersion?.id).not.toBe(first);
    expect(preserved.memberships).toHaveLength(3);
    const again = store.prepare(conflictBackup);

    expect(again.skippedSnippets).toBe(2);
    store.invoke('commitLibraryImport', { token: again.token, revision: again.revision });
    expect(store.export()).toEqual(preserved);
    const tagId = imported.memberships[0]?.tagId;

    if (preservedVersion === undefined || tagId === undefined)
      throw new Error('Expected preserved version and tag');
    store.invoke('deleteSnippet', { id: preservedVersion.id });
    // A remap candidate can also be another record's deliberate original ID.
    const collision = store.prepare({
      ...conflictBackup,
      snippets: [...conflictBackup.snippets, { ...preservedVersion, text: 'separate original ID' }],
      memberships: [...conflictBackup.memberships, { snippetId: preservedVersion.id, tagId }]
    });

    store.invoke('commitLibraryImport', { token: collision.token, revision: collision.revision });
    expect(store.invoke('getSnippet', { id: preservedVersion.id }).snippet.text).toBe(
      'separate original ID'
    );
    expect(store.export().snippets).toHaveLength(4);
    const changed = store.prepare(store.export());

    store.invoke('updateSnippet', { id: first, text: 'edited after review' });
    const afterEdit = store.export();

    expect(
      store.engine.run(1, 'commitLibraryImport', {
        token: changed.token,
        revision: changed.revision
      }).result
    ).toMatchObject({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Your library changed. Choose the file again to review it.'
      }
    });
    expect(store.export()).toEqual(afterEdit);
    store.invoke('discardLibraryImport', { token: changed.token });
    const tagChange = store.prepare(afterEdit);

    const existingTag = imported.tags[0];

    if (existingTag === undefined) throw new Error('Expected imported tag');
    store.invoke('updateTag', { id: existingTag.id, name: 'renamed', color: 'red' });
    expect(
      store.engine.run(1, 'commitLibraryImport', {
        token: tagChange.token,
        revision: tagChange.revision
      }).result
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    store.invoke('discardLibraryImport', { token: tagChange.token });
    const cancelled = store.prepare(store.export());

    store.invoke('discardLibraryImport', { token: cancelled.token });
    expect(
      store.engine.run(1, 'commitLibraryImport', {
        token: cancelled.token,
        revision: cancelled.revision
      }).result
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    const truncated = store.exportFile();

    truncateSync(truncated, statSync(truncated).size - 10);
    expect(
      store.engine.run(1, 'prepareLibraryImport', { filename: truncated }).result
    ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  } finally {
    store.dispose();
  }
});
