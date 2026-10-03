import { mkdirSync, writeFileSync } from 'node:fs';
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
    const {
      applicationDirectory,
      installedExecutable,
      stableExecutable,
      loginEntries,
      application
    } = loginTestFixture(fixtureDirectory);

    login = loginPreferences(application, installedExecutable);
    seedLegacyShortcutProfile(fixture.store);
    await fixture.service.initialize();
    const initial = await fixture.service.services.getSettings({});

    if (!initial.ok) throw new Error('Expected retained Windows preferences.');
    expect(Object.keys(initial.value.settings)).not.toContain('showDockIcon');
    expect(initial.value.settings).toMatchObject({
      openShortcut: 'Control+F',
      pinShortcut: 'Super+P'
    });
    expect(initial.value.settings.localShortcuts).toMatchObject({
      copy: 'Return',
      dismiss: 'Escape',
      cancelEdit: 'Escape'
    });
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
      revision: 2,
      settings: {
        theme: 'light',
        alwaysOnTop: false,
        openShortcut: 'Control+F',
        pinShortcut: 'Super+P',
        localShortcuts: { copy: 'Control+K', dismiss: 'Escape', cancelEdit: 'Escape' }
      }
    });
    for (const patch of [
      { localShortcuts: { ...localShortcuts, tag: 'Control+K' } },
      { localShortcuts: { ...localShortcuts, copy: 'Super+P' } },
      { pinShortcut: 'Super+T' }
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
      revision: 2,
      settings: { localShortcuts: { copy: 'Control+K' } }
    });
    expect(
      await fixture.service.services.updateSettings({ theme: 'dark', alwaysOnTop: true })
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect({ theme, pinned }).toEqual({ theme: 'light', pinned: false });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {})).toMatchObject({
      revision: 2,
      settings: { theme: 'light', alwaysOnTop: false }
    });
    expect(await fixture.service.services.updateSettings({ launchAtLogin: true })).toMatchObject({
      ok: true,
      value: { settings: { launchAtLogin: true } }
    });
    expect(loginEntries.get(stableExecutable)).toBe(true);
    expect(loginEntries.has(installedExecutable)).toBe(false);
    const upgradedExecutable = path.join(applicationDirectory, 'app-0.2.0', 'Promptly.exe');

    mkdirSync(path.dirname(upgradedExecutable));
    writeFileSync(upgradedExecutable, 'owned fixture, not executed');
    expect(loginPreferences(application, upgradedExecutable).getLogin()).toBe(true);
    const unpackedExecutable = path.join(fixtureDirectory, 'unpacked', 'Promptly.exe');
    const unpacked = loginPreferences(application, unpackedExecutable);

    unpacked.setLogin(true);
    expect(loginEntries.get(unpackedExecutable)).toBe(true);
    const development = loginPreferences(
      { ...application, isPackaged: false },
      installedExecutable
    );

    development.setLogin(true);
    expect(loginEntries.get(installedExecutable)).toBe(true);
    let applicationId = '';
    const setupApplication = {
      ...application,
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
