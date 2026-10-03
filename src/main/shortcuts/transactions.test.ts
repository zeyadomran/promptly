// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { testSettings } from '../settings/settings-test-fixture';
import { shortcutFixture } from './shortcut-test-fixture';

it('rejected OS replacement preserves durable preferences and the previous live command', async () => {
  const fixture = shortcutFixture(vi.fn);
  const storage = testSettings({ available: [fixture.shortcuts.controller], unavailable: [] });

  try {
    storage.store.invoke('updateSettings', {
      openShortcut: 'Control+F',
      pinShortcut: 'Super+P'
    });
    await storage.service.initialize();
    const initial = await storage.service.services.getSettings({});

    if (!initial.ok) throw new Error('Expected initial preferences.');
    expect(fixture.registered.has('Control+F')).toBe(true);
    expect(fixture.registered.has('Super+P')).toBe(true);
    fixture.failures.add('Control+Alt+F9');
    expect(
      await storage.service.services.updateSettings({
        openShortcut: 'Control+Alt+F9',
        pinShortcut: 'Control+Alt+F8'
      })
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(await storage.service.services.getSettings({})).toEqual(initial);
    fixture.registered.get('Control+F')?.();
    expect(fixture.commands.open).toHaveBeenCalledOnce();
    expect(fixture.registered.has('Control+Alt+F8')).toBe(false);
  } finally {
    await fixture.shortcuts.close();
    storage.store.dispose();
  }
});
