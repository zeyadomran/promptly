import assert from 'node:assert/strict';

import type { testSettings } from '../settings/settings-test-fixture';
import { shortcutServices } from './ipc-services';
import type { shortcutFixture } from './shortcut-test-fixture';

/** The same retained profile and registrations used by the canonical transaction flow. */
export async function exerciseShortcutRecovery(
  fixture: ReturnType<typeof shortcutFixture>,
  storage: ReturnType<typeof testSettings>
): Promise<void> {
  const services = shortcutServices(fixture.shortcuts);
  const retained = await storage.service.services.getSettings({});

  assert.deepEqual([...fixture.registered.keys()], []);
  assert.partialDeepStrictEqual(fixture.shortcuts.status, {
    capture: 'unavailable',
    open: 'unavailable',
    pin: 'unavailable'
  });
  assert.partialDeepStrictEqual(await services.retryShortcuts({}), {
    ok: true,
    value: { open: 'unavailable' }
  });
  fixture.failures.delete('Control+F');
  fixture.shortcuts.record(7, true);
  assert.partialDeepStrictEqual(await services.retryShortcuts({}), {
    ok: false,
    error: { code: 'UNAVAILABLE' }
  });
  assert.deepEqual([...fixture.registered.keys()], []);
  fixture.shortcuts.release(7);
  fixture.registered.delete('Control+F');
  await fixture.shortcuts.sleep();
  assert.partialDeepStrictEqual(await services.retryShortcuts({}), {
    ok: false,
    error: { code: 'UNAVAILABLE' }
  });
  fixture.failures.add('Control+F');
  await fixture.shortcuts.resume();
  fixture.failures.delete('Control+F');
  fixture.shortcuts.setPaused(true);
  assert.partialDeepStrictEqual(await services.retryShortcuts({}), {
    ok: true,
    value: { open: 'registered', capturePaused: true }
  });
  assert.deepEqual([...fixture.registered.keys()], ['Control+F']);
  fixture.shortcuts.setPaused(false);
  assert.deepEqual(await storage.service.services.getSettings({}), retained);
  for (const accelerator of ['Shift+A', 'Shift+1', 'Shift+Space', 'Shift+Plus', 'Shift+Num1']) {
    for (const patch of [
      { openShortcut: accelerator },
      { pinShortcut: accelerator },
      { saveShortcut: { kind: 'combination' as const, accelerator } }
    ])
      assert.partialDeepStrictEqual(await storage.service.services.updateSettings(patch), {
        ok: false,
        error: { code: 'INVALID_REQUEST' }
      });
  }

  assert.deepEqual(await storage.service.services.getSettings({}), retained);
  assert.partialDeepStrictEqual(
    await storage.service.services.updateSettings({
      pinShortcut: 'Super+P',
      saveShortcut: { kind: 'combination', accelerator: 'Control+Alt+F7' }
    }),
    { ok: true }
  );
}
