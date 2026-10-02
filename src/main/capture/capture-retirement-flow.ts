import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import type { captureFixture } from './capture-test-fixture';
import type { CaptureEvent } from './ports';

type Fixture = ReturnType<typeof captureFixture>;

/** Sequential phases of the canonical capture flow; no independently collected cases. */
export async function assertQueuedResetRetirement(fixture: Fixture, id: string) {
  const { store, shortcuts, keyboard, service, os, sources } = fixture;

  await shortcuts.controller.apply(keyboard.settings);
  const beforeReset = store.invoke('getRevision', {}).revision;
  const queued = new Promise<CaptureEvent>((resolve) => {
    const unsubscribe = service.subscribe((queuedEvent) => {
      unsubscribe();
      resolve(queuedEvent);
    });
  });

  os.text = 'queued before hook reset';
  keyboard.tap(0);
  keyboard.tap(100);
  keyboard.hook.health.installed = false;
  keyboard.frame({ kind: 'reset', timeMs: 120 });
  const event = await queued;
  const completed = await fixture.triggered;

  assert.deepEqual(
    { status: event.status, reason: event.reason },
    { status: 'failed', reason: 'CONFLICT' }
  );
  assert.equal(completed?.ok, false);
  assert.equal(completed.error.code, 'CONFLICT');
  assert.equal(store.invoke('getRevision', {}).revision, beforeReset);
  assert.equal(sources.available(id), true);
  keyboard.hook.health.installed = true;
  keyboard.frame({
    kind: 'ready',
    timeMs: 121,
    mask: 0,
    installed: true
  });
}

export async function assertImportRetirement(
  fixture: Fixture,
  waitForSelection: () => Promise<void>
) {
  const { store, service, sources, transfer, os } = fixture;

  os.selected = Promise.resolve();
  os.text = 'kept before import';
  const beforeImport = await service.capture();

  if (!beforeImport.ok || beforeImport.value.status === 'empty')
    throw new Error('Expected the existing capture before import.');
  const retainedId = beforeImport.value.snippet.id;
  const importedId = '11111111-1111-4111-8111-111111111111';
  const importedTagId = '22222222-2222-4222-8222-222222222222';

  assert.equal(sources.available(retainedId), true);
  os.importFilename = path.join(path.dirname(store.filename), 'owned-import.json');
  writeFileSync(
    os.importFilename,
    JSON.stringify({
      format: 'promptly-library',
      version: 1,
      snippets: [
        {
          id: importedId,
          text: 'Imported record',
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
          lastCopiedAt: null,
          copyCount: 2
        }
      ],
      tags: [
        {
          id: importedTagId,
          name: 'imported',
          color: 'blue',
          createdAt: '2020-01-01T00:00:00.000Z'
        }
      ],
      memberships: [{ snippetId: importedId, tagId: importedTagId }]
    })
  );
  const preview = await transfer.services.previewLibraryImport({}, { senderId: 1 });

  if (!preview.ok || preview.value.status !== 'preview')
    throw new Error('Expected import preview.');
  let release: () => void = () => undefined;

  os.selected = new Promise<void>((resolve) => {
    release = resolve;
  });
  os.text = 'stale foreground after import';
  const retiredByImport = service.capture();

  try {
    await waitForSelection();
    const imported = await transfer.services.confirmLibraryImport(
      { token: preview.value.preview.token, revision: preview.value.preview.revision },
      { senderId: 1 }
    );

    assert.equal(imported.ok, true);
    release();
    const retired = await retiredByImport;

    assert.equal(retired.ok, false);
    assert.equal(retired.error.code, 'CONFLICT');
    assert.equal(sources.available(retainedId), false);
    const snippet = store.invoke('getSnippet', { id: importedId }).snippet;

    assert.equal(snippet.text, 'Imported record');
    assert.equal(snippet.copyCount, 2);
    assert.deepEqual(
      snippet.tags.map((tag) => ({ id: tag.id, name: tag.name })),
      [{ id: importedTagId, name: 'imported' }]
    );
    assert.equal(store.invoke('getSnippet', { id: retainedId }).snippet.text, 'kept before import');
    assert.equal(
      store.invoke('searchSnippets', {
        query: 'stale foreground',
        tagIds: [],
        untagged: false,
        sort: 'newest',
        offset: 0,
        limit: 10
      }).total,
      0
    );
  } finally {
    release();
    await retiredByImport;
    os.selected = Promise.resolve();
  }
}
