import { expect, it } from 'vitest';

import { testSettings } from './settings-test-fixture';

it('keeps unavailable optional startup preferences intact while permitting unrelated settings', async () => {
  const fixture = testSettings({
    unavailable: [],
    available: [
      {
        name: 'system tray',
        keys: ['showInTray'],
        optionalStartup: true,
        apply: () => {
          throw new Error('Controlled native tray failure');
        }
      },
      {
        name: 'launch at login',
        keys: ['launchAtLogin'],
        initialize: () => {
          throw new Error('Owned login observation unavailable.');
        },
        optionalStartup: true,
        apply: () => {
          throw new Error('Controlled native login failure');
        }
      }
    ]
  });

  try {
    fixture.store.invoke('updateSettings', { launchAtLogin: true });
    expect(await fixture.service.initialize()).toMatchObject({
      settings: { showInTray: true, launchAtLogin: true }
    });
    expect(fixture.service.isUnavailable('showInTray')).toBe(true);
    expect(fixture.service.isUnavailable('launchAtLogin')).toBe(true);
    expect(await fixture.service.services.updateSettings({ theme: 'dark' })).toMatchObject({
      ok: true
    });
    for (const patch of [{ showInTray: false }, { launchAtLogin: false }])
      expect(await fixture.service.services.updateSettings(patch)).toMatchObject({
        ok: false,
        error: { code: 'UNAVAILABLE' }
      });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      revision: 2,
      settings: { theme: 'dark', showInTray: true, launchAtLogin: true }
    });
  } finally {
    await fixture.service.close();
    fixture.store.dispose();
  }
});
