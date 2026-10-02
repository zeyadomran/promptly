import { expect, test } from '@playwright/test';

import {
  launchSettingsUiFixture,
  readOwnedNativePreferences,
  resizeSettings
} from './settings-ui-fixture';

test('Settings persists authoritative preferences, exposes native rejection and returns to the main window', async () => {
  const owned = await launchSettingsUiFixture();
  let { application, main, settings } = owned;
  const firstCsp = await settings
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');

  try {
    const login = settings.getByRole('switch', { name: 'Launch at login' });

    await application.evaluate(({ app }) => {
      app.emit('owned-settings-reject-login', true);
    });
    await login.click();
    await expect(settings.getByRole('alert')).toContainText('Unable to apply launch at login');
    await expect(login).not.toBeChecked();
    await expect(login).toHaveAttribute('aria-invalid', 'true');
    await expect(login).toHaveAccessibleDescription(/Unable to apply launch at login/);
    expect(await settings.evaluate(() => window.promptly.getSettings({}))).toMatchObject({
      ok: true,
      value: { settings: { launchAtLogin: false } }
    });
    await settings.screenshot({
      path: test.info().outputPath('general-login-rejected.png'),
      scale: 'css'
    });
    await application.evaluate(({ app }) => {
      app.emit('owned-settings-reject-login', false);
    });
    await login.click();
    await expect(login).toBeChecked();
    expect(await readOwnedNativePreferences(application)).toMatchObject({ login: true });
    await expect(settings.getByRole('alert')).toHaveCount(0);
    await expect(
      settings.getByRole('switch', { name: /Show in (system tray|menu bar)/ })
    ).toBeDisabled();
    await expect(
      settings.getByRole('switch', { name: /Show in (system tray|menu bar)/ })
    ).not.toBeChecked();
    if (process.platform === 'win32')
      await expect(settings.getByRole('switch', { name: 'Show Dock icon' })).toHaveCount(0);
    await settings
      .getByRole('radiogroup', { name: 'Hide after copy' })
      .getByText('Never', { exact: true })
      .click();
    await settings
      .getByRole('radiogroup', { name: 'Default size' })
      .getByText('Regular', { exact: true })
      .click();
    expect(await main.evaluate(() => window.promptly.getWindowState({}))).toMatchObject({
      ok: true,
      value: { mode: 'compact' }
    });
    await settings.getByRole('tab', { name: 'Appearance' }).click();
    await settings
      .getByRole('radiogroup', { name: 'Theme' })
      .getByText('Dark', { exact: true })
      .click();
    await expect(main.locator('html')).toHaveAttribute('data-theme', 'dark');
    await settings.getByRole('switch', { name: 'Always on top' }).click();
    await expect(main.locator('footer')).toContainText('Always on top');
    expect(
      await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => window.isAlwaysOnTop())
      )
    ).toBe(true);
    ({ application, main, settings } = await owned.restart());
    expect(
      await settings.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
    ).not.toBe(firstCsp);
    await expect(settings.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await settings.evaluate(() => window.promptlyInitialSettings)).toMatchObject({
      settings: {
        launchAtLogin: true,
        hideAfterCopy: 'never',
        defaultSizeMode: 'regular',
        alwaysOnTop: true,
        theme: 'dark'
      }
    });
    expect(await readOwnedNativePreferences(application)).toMatchObject({ login: true });
    expect(await main.evaluate(() => window.promptly.getWindowState({}))).toMatchObject({
      ok: true,
      value: { mode: 'regular' }
    });
    if (process.platform === 'darwin') {
      await application.evaluate(({ app }) => {
        app.emit('owned-settings-reject-dock', true);
      });
      await settings.getByRole('switch', { name: 'Show Dock icon' }).click();
      await expect(settings.getByRole('alert')).toContainText('Unable to apply dock icon');
      await expect(settings.getByRole('switch', { name: 'Show Dock icon' })).toBeChecked();
      await application.evaluate(({ app }) => {
        app.emit('owned-settings-reject-dock', false);
      });
      await settings.getByRole('switch', { name: 'Show Dock icon' }).click();
      await expect(settings.getByRole('switch', { name: 'Show Dock icon' })).not.toBeChecked();
      expect(await settings.evaluate(() => window.promptly.getWindowRecovery({}))).toMatchObject({
        ok: true,
        value: { dock: false, tray: false, shortcut: false, mainReachable: true }
      });
      expect(await readOwnedNativePreferences(application)).toMatchObject({ dock: false });
    }

    await application.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((window) => window.getTitle() === 'Promptly')
        ?.hide();
    });
    await settings.close();
    await expect.poll(() => application.windows().length).toBe(1);
    expect(await main.evaluate(() => window.promptly.getWindowState({}))).toMatchObject({
      ok: true,
      value: { visible: true }
    });
    await main.evaluate(() => window.promptly.openDesktopWindow({ kind: 'settings' }));
    const reopened = application.windows().find((page) => page.url().endsWith('#settings'));

    if (reopened === undefined) throw new Error('Settings did not reopen.');
    await resizeSettings(application, 440);
    await reopened.getByRole('button', { name: 'Back to Promptly' }).click();
    await expect.poll(() => application.windows().length).toBe(1);
    expect(await main.evaluate(() => window.promptly.getWindowState({}))).toMatchObject({
      ok: true,
      value: { visible: true }
    });
  } finally {
    await owned.dispose();
  }
});
