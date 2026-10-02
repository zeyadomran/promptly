import { expect, it } from 'vitest';

import { testSettings } from './settings-test-fixture';

it('persists settings across reopen and rolls back rejected native effects', async () => {
  let theme = 'system';
  let pinned = false;
  const fixture = testSettings({
    unavailable: [],
    available: [
      {
        keys: ['theme'],
        name: 'theme',
        apply: (settings) => {
          theme = settings.theme;
          return Promise.resolve();
        }
      },
      {
        keys: ['alwaysOnTop'],
        name: 'pin',
        apply: (settings) => {
          pinned = settings.alwaysOnTop;
          if (pinned) throw new Error('Native failure');
          return Promise.resolve();
        }
      }
    ]
  });

  try {
    fixture.store.engine.context.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('showDockIcon', 'false');
    fixture.store.engine.context.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('openShortcut', '"CommandOrControl+Space"');
    fixture.store.engine.context.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('pinShortcut', '"Super+P"');
    await fixture.service.initialize();
    const initial = await fixture.service.services.getSettings({});

    if (!initial.ok) throw new Error('Expected retained Windows preferences.');
    expect(Object.keys(initial.value.settings)).not.toContain('showDockIcon');
    expect(initial.value.settings).toMatchObject({
      openShortcut: 'CommandOrControl+Space',
      pinShortcut: 'Super+P'
    });
    expect(await fixture.service.services.updateSettings({ theme: 'light' })).toMatchObject({
      ok: true,
      value: { settings: { theme: 'light' } }
    });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      revision: 1,
      settings: {
        theme: 'light',
        alwaysOnTop: false,
        openShortcut: 'CommandOrControl+Space',
        pinShortcut: 'Super+P'
      }
    });
    expect(
      await fixture.service.services.updateSettings({ theme: 'dark', alwaysOnTop: true })
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect({ theme, pinned }).toEqual({ theme: 'light', pinned: false });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      revision: 1,
      settings: { theme: 'light', alwaysOnTop: false }
    });
  } finally {
    await fixture.service.close();
    fixture.store.dispose();
  }
});
