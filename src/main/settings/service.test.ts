import path from 'node:path';

import { expect, it } from 'vitest';

import { defaultSettings } from '../../shared/contracts/settings';
import { loginPreferences, prepareSquirrelLogin } from './login-preferences';
import { loginTestFixture } from './login-test-fixture';
import { seedLegacyShortcutProfile, testSettings } from './settings-test-fixture';

it('persists settings across reopen and rolls back rejected native effects', async () => {
  let theme = 'system';
  let pinned = false;
  let login: ReturnType<typeof loginPreferences>;
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
        keys: ['launchAtLogin'],
        name: 'launch at login',
        apply: (settings) => {
          login.setLogin(settings.launchAtLogin);
          if (login.getLogin() !== settings.launchAtLogin) throw new Error('Login was rejected.');
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
    const fixtureDirectory = path.dirname(fixture.store.filename);
    const installation = loginTestFixture(fixtureDirectory);

    login = loginPreferences(installation.application, installation.installedExecutable);
    seedLegacyShortcutProfile(fixture.store);
    await fixture.service.initialize();
    const initial = await fixture.service.services.getSettings({});

    if (!initial.ok) throw new Error('Expected retained Windows preferences.');
    expect(Object.keys(initial.value.settings)).not.toContain('showDockIcon');
    expect(initial.value.settings).toMatchObject({
      openShortcut: 'Control+F',
      pinShortcut: 'Control+T'
    });
    expect(initial.value.settings.localShortcuts.cancelEdit).toBe('Escape');
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
    expect(installation.loginEntries.has(installation.installedExecutable)).toBe(false);
    const upgradedExecutable = installation.createUpgradeExecutable();

    expect(loginPreferences(installation.application, upgradedExecutable).getLogin()).toBe(true);
    const unpackedExecutable = path.join(fixtureDirectory, 'unpacked', 'Promptly.exe');
    const unpacked = loginPreferences(installation.application, unpackedExecutable);

    unpacked.setLogin(true);
    expect(installation.loginEntries.get(unpackedExecutable)).toBe(true);
    const development = loginPreferences(
      { ...installation.application, isPackaged: false },
      installation.installedExecutable
    );

    development.setLogin(true);
    expect(installation.loginEntries.get(installation.installedExecutable)).toBe(true);
    let applicationId = '';
    const setupApplication = {
      ...installation.application,
      setAppUserModelId: (identity: string) => {
        applicationId = identity;
      }
    };
    const cleanupErrors: unknown[] = [];
    const reportCleanupError = (error: unknown) => cleanupErrors.push(error);

    prepareSquirrelLogin(
      setupApplication,
      '--squirrel-updated',
      reportCleanupError,
      upgradedExecutable
    );
    expect(login.getLogin()).toBe(true);
    prepareSquirrelLogin(
      setupApplication,
      '--squirrel-uninstall',
      reportCleanupError,
      upgradedExecutable
    );
    expect(applicationId).toBe('com.squirrel.Promptly.Promptly');
    expect(login.getLogin()).toBe(false);
    expect(cleanupErrors).toEqual([]);
    const deniedCleanup = new Error('Native removal denied');

    prepareSquirrelLogin(
      {
        ...setupApplication,
        setLoginItemSettings: () => {
          throw deniedCleanup;
        }
      },
      '--squirrel-uninstall',
      reportCleanupError,
      upgradedExecutable
    );
    expect(cleanupErrors).toEqual([deniedCleanup]);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      settings: { launchAtLogin: true, theme: 'light' }
    });
  } finally {
    await fixture.service.close();
    fixture.store.dispose();
  }
});
