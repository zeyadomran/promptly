import { expect, test } from '@playwright/test';

import { launchSettingsUiFixture, readOwnedNativePreferences } from './settings-ui-fixture';

test('hosted native preferences retain authoritative state and restore initial OS preferences', async () => {
  test.skip(
    process.env['GITHUB_ACTIONS'] !== 'true' ||
      process.env['RUNNER_ENVIRONMENT'] !== 'github-hosted',
    'Only an ephemeral GitHub-hosted runner may change native login/Dock preferences.'
  );
  const owned = await launchSettingsUiFixture(true, async (receipt) => {
    await test.info().attach('native-preferences-restored', {
      body: receipt,
      contentType: 'application/json'
    });
  });
  const { settings, main, application } = owned;
  const failures: unknown[] = [];

  try {
    const login = settings.getByRole('switch', { name: 'Launch at login' });

    await login.click();
    await expect
      .poll(
        async () => (await login.isChecked()) || (await settings.getByRole('alert').count()) > 0
      )
      .toBe(true);
    await expect(login).toBeEnabled();
    const native = await readOwnedNativePreferences(application);

    if (process.platform === 'win32' || native.login) {
      await expect(login).toBeChecked();
      expect(native.login).toBe(true);
      expect(await settings.evaluate(() => window.promptly.getSettings({}))).toMatchObject({
        ok: true,
        value: { settings: { launchAtLogin: true } }
      });
    } else {
      // Electron documents that unsigned macOS builds may reject login-item registration.
      await expect(login).not.toBeChecked();
      await expect(settings.getByRole('alert')).toContainText('Unable to apply launch at login');
      expect(await settings.evaluate(() => window.promptly.getSettings({}))).toMatchObject({
        ok: true,
        value: { settings: { launchAtLogin: false } }
      });
    }

    await test.info().attach('native-login-readback', {
      body: JSON.stringify({ enabled: native.login, unsignedMacDenial: !native.login }),
      contentType: 'application/json'
    });
    if (process.platform === 'darwin') {
      expect(await settings.evaluate(() => window.promptly.getWindowRecovery({}))).toMatchObject({
        ok: true,
        value: { dock: true, tray: false, shortcut: false }
      });
      await main.evaluate(() => window.promptly.setWindowVisibility({ visible: false }));
      expect(await main.evaluate(() => window.promptly.getWindowState({}))).toMatchObject({
        ok: true,
        value: { visible: false }
      });
      await settings.getByRole('switch', { name: 'Show Dock icon' }).click();
      await expect(settings.getByRole('switch', { name: 'Show Dock icon' })).not.toBeChecked();
      expect(await readOwnedNativePreferences(application)).toMatchObject({ dock: false });
      expect(await main.evaluate(() => window.promptly.getWindowRecovery({}))).toMatchObject({
        ok: true,
        value: { dock: false, tray: false, shortcut: false, mainReachable: true }
      });
      expect(await main.evaluate(() => window.promptly.getWindowState({}))).toMatchObject({
        ok: true,
        value: { visible: true }
      });
      await settings.getByRole('switch', { name: 'Show Dock icon' }).click();
      await expect(settings.getByRole('switch', { name: 'Show Dock icon' })).toBeChecked();
      expect(await readOwnedNativePreferences(application)).toMatchObject({ dock: true });
    }
  } catch (error) {
    failures.push(error);
  } finally {
    await owned.dispose().catch((error: unknown) => {
      failures.push(error);
    });
  }

  if (failures.length > 0)
    throw new AggregateError(failures, 'Native Settings qualification failed.');
});
