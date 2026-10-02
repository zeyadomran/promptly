import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { transferStore } from './transfer-test-fixture';

it('rejects invalid imports and atomically coalesces colliding tag memberships', () => {
  const store = transferStore();

  try {
    const baseline = store.export();

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
  } finally {
    store.dispose();
  }
});
