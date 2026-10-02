import { expect, it } from 'vitest';

import { testSettings } from './settings-test-fixture';

it('rejects native effects without changing authoritative durable settings', async () => {
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
    await fixture.service.initialize();
    expect(
      await fixture.service.services.updateSettings({ theme: 'dark', alwaysOnTop: true })
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect({ theme, pinned }).toEqual({ theme: 'system', pinned: false });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      revision: 0,
      settings: { theme: 'system', alwaysOnTop: false }
    });
  } finally {
    await fixture.service.close();
    fixture.store.dispose();
  }
});
