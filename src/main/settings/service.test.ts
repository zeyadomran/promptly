import path from 'node:path';

import { expect, it } from 'vitest';

import { defaultSettings } from '../../shared/contracts/settings';
import { assertComposeMigration } from './compose-migration-test-flow';
import { loginController } from './login-controller';
import { loginPreferences } from './login-preferences';
import { loginTestFixture } from './login-test-fixture';
import { exerciseLoginInstallation } from './login-test-flow';
import { seedLegacyShortcutProfile, testSettings } from './settings-test-fixture';

it('persists settings across reopen and rolls back rejected native effects', async () => {
  let theme = 'system';
  let pinned = false;
  let login: ReturnType<typeof loginPreferences>;
  const fixture = testSettings({
    unavailable: [],
    loginStatus: () => login.getLoginState(),
    available: [
      {
        keys: ['theme'],
        name: 'theme',
        apply: (settings) => {
          theme = settings.theme;
          return Promise.resolve();
        }
      },
      loginController({
        setLogin: (...args) => {
          login.setLogin(...args);
        },
        getLogin: () => login.getLogin(),
        getLoginState: () => login.getLoginState()
      }),
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
    const fixtureDirectory = path.dirname(fixture.store.filename);
    const installation = loginTestFixture(fixtureDirectory);

    login = loginPreferences(installation.application, installation.installedExecutable);
    installation.loginEntries.set(installation.stableExecutable, true);
    installation.approved.set(installation.stableExecutable, false);
    expect(
      installation.application.getLoginItemSettings({ path: installation.stableExecutable })
    ).toMatchObject({
      openAtLogin: true,
      launchItems: []
    });
    fixture.store.engine.context.db
      .prepare('UPDATE settings SET value = ? WHERE key = ?')
      .run('true', 'launchAtLogin');
    seedLegacyShortcutProfile(fixture.store);
    await fixture.service.initialize();
    expect(installation.approved.get(installation.stableExecutable)).toBe(false);
    expect(await fixture.service.services.getLoginStatus({})).toEqual({
      ok: true,
      value: { requested: true, registered: true, enabled: false, available: true }
    });
    const initial = await fixture.service.services.getSettings({});

    if (!initial.ok) throw new Error('Expected retained Windows preferences.');
    expect(Object.keys(initial.value.settings)).not.toContain('showDockIcon');
    expect(initial.value.settings).toMatchObject({
      openShortcut: 'Control+F',
      pinShortcut: 'Control+T'
    });
    expect(initial.value.settings.localShortcuts.cancelEdit).toBe('Escape');
    expect(initial.value.settings.localShortcuts.copy).toBe('Control+K');
    expect(initial.value.settings.localShortcuts.deleteAlternate).toBeNull();
    expect(await fixture.service.services.updateSettings({ doubleTapWindowMs: 400 })).toMatchObject(
      { ok: true }
    );
    expect(await fixture.service.services.updateSettings({ theme: 'light' })).toMatchObject({
      ok: true
    });
    const localShortcuts = {
      ...defaultSettings().localShortcuts,
      copy: 'Control+K',
      focusSearch: 'Control+S'
    };

    expect(await fixture.service.services.updateSettings({ localShortcuts })).toMatchObject({
      ok: true
    });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      revision: 3,
      settings: {
        theme: 'light',
        alwaysOnTop: false,
        openShortcut: 'Control+F',
        pinShortcut: 'Control+T',
        doubleTapWindowMs: 400,
        localShortcuts: { copy: 'Control+K', dismiss: 'Escape', cancelEdit: 'Escape' }
      }
    });
    for (const patch of [
      { localShortcuts: { ...localShortcuts, tag: 'Control+K' } },
      { localShortcuts: { ...localShortcuts, copy: 'Control+T' } },
      { pinShortcut: 'Super+T' },
      { localShortcuts: { ...localShortcuts, settings: 'Super+L' } }
    ])
      expect(await fixture.service.services.updateSettings(patch)).toMatchObject({
        ok: false,
        error: { code: 'CONFLICT' }
      });
    for (const invalid of [
      { ...localShortcuts, copy: 'Tab' },
      { ...localShortcuts, cancelEdit: 'Space' },
      { ...localShortcuts, cancelEdit: 'Control+C' }
    ])
      expect(
        await fixture.service.services.updateSettings({ localShortcuts: invalid })
      ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      revision: 3,
      settings: { localShortcuts: { copy: 'Control+K' } }
    });
    expect(
      await fixture.service.services.updateSettings({
        localShortcuts: { ...localShortcuts, tag: 'Control+G' }
      })
    ).toMatchObject({ ok: true });
    expect(
      await fixture.service.services.updateSettings({ theme: 'dark', alwaysOnTop: true })
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect({ theme, pinned }).toEqual({ theme: 'light', pinned: false });
    expect(
      await fixture.service.services.updateSettings({ launchAtLogin: true, alwaysOnTop: true })
    ).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' }
    });
    expect(installation.approved.get(installation.stableExecutable)).toBe(false);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      revision: 4,
      settings: { theme: 'light', alwaysOnTop: false, localShortcuts: { tag: 'Control+G' } }
    });
    expect(await fixture.service.services.updateSettings({ launchAtLogin: true })).toMatchObject({
      ok: true,
      value: { settings: { launchAtLogin: true } }
    });
    expect(installation.loginEntries.get(installation.stableExecutable)).toBe(true);
    expect(await fixture.service.services.getLoginStatus({})).toEqual({
      ok: true,
      value: { requested: true, registered: true, enabled: true, available: true }
    });
    expect(installation.loginEntries.has(installation.installedExecutable)).toBe(false);
    exerciseLoginInstallation(installation, fixtureDirectory, login);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      settings: { launchAtLogin: true, theme: 'light' }
    });
    await assertComposeMigration();
  } finally {
    await fixture.service.close();
    fixture.store.dispose();
  }
});
