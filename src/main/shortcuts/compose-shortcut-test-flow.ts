import assert from 'node:assert/strict';

import type { testSettings } from '../settings/settings-test-fixture';
import type { shortcutFixture } from './shortcut-test-fixture';

export async function assertComposeShortcutFlow(
  fixture: ReturnType<typeof shortcutFixture>,
  storage: ReturnType<typeof testSettings>
) {
  const destinations: string[] = [];

  fixture.commands.compose = () => {
    destinations.push(storage.service.current.settings.composeDestination);
    return undefined;
  };

  assert.partialDeepStrictEqual(fixture.shortcuts.status, {
    compose: 'registered',
    labels: { compose: 'Alt+Shift+N' }
  });
  const trigger = fixture.registered.get('Alt+Shift+N');

  trigger?.();
  assert.deepEqual(destinations, ['queue']);
  fixture.shortcuts.record(77, true);
  trigger?.();
  assert.equal(fixture.shortcuts.status.labels.compose, null);
  assert.deepEqual(destinations, ['queue']);
  fixture.shortcuts.release(77);
  await fixture.shortcuts.sleep();
  trigger?.();
  assert.equal(fixture.shortcuts.status.labels.compose, null);
  assert.deepEqual(destinations, ['queue']);
  await fixture.shortcuts.resume();
  fixture.shortcuts.setPaused(true);
  trigger?.();
  assert.deepEqual(destinations, ['queue', 'queue']);
  fixture.shortcuts.setPaused(false);
  assert.partialDeepStrictEqual(
    await storage.service.services.updateSettings({
      composeShortcut: null,
      composeDestination: 'library'
    }),
    { ok: true }
  );
  assert.partialDeepStrictEqual(fixture.shortcuts.status, {
    compose: 'disabled',
    labels: { compose: null }
  });
  fixture.failures.add('Alt+Shift+X');
  assert.partialDeepStrictEqual(
    await storage.service.services.updateSettings({ composeShortcut: 'Alt+Shift+X' }),
    { ok: false, error: { code: 'CONFLICT' } }
  );
  storage.store.reopen();
  assert.equal(storage.store.invoke('getSettings', {}).settings.composeShortcut, null);
  assert.equal(storage.store.invoke('getSettings', {}).settings.composeDestination, 'library');
  fixture.failures.delete('Alt+Shift+X');
  assert.partialDeepStrictEqual(
    await storage.service.services.updateSettings({ composeShortcut: 'Alt+Shift+X' }),
    { ok: true }
  );
  fixture.registered.get('Alt+Shift+X')?.();
  assert.deepEqual(destinations, ['queue', 'queue', 'library']);
  assert.partialDeepStrictEqual(
    await storage.service.services.updateSettings({
      composeShortcut: 'Alt+Shift+N',
      composeDestination: 'queue'
    }),
    { ok: true }
  );
}
