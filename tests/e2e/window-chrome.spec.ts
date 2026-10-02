import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';

test('packaged chrome hit regions, theme, responsive settings and search-focus contract', async () => {
  const directory = path.resolve('out', `Promptly-${process.platform}-${process.arch}`);
  const executable =
    process.platform === 'darwin'
      ? path.join(directory, 'Promptly.app', 'Contents', 'MacOS', 'Promptly')
      : path.join(directory, 'Promptly.exe');
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE'
    )
  );
  const isolated = await launchIsolatedElectron(executable, env);
  const app = isolated.application;

  try {
    const page = await app.firstWindow();

    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    expect(
      await page
        .locator('header')
        .evaluate((element) => getComputedStyle(element).getPropertyValue('-webkit-app-region'))
    ).toBe('drag');
    expect(
      await page
        .locator('.window-title-actions')
        .evaluate((element) => getComputedStyle(element).getPropertyValue('-webkit-app-region'))
    ).toBe('no-drag');
    expect(
      await page
        .locator('header button')
        .first()
        .evaluate((element) => getComputedStyle(element).getPropertyValue('-webkit-app-region'))
    ).toBe('no-drag');
    await page.getByRole('button', { name: 'Use light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Use dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // Stand-in for the later P15 input verifies the reusable focus opt-in, without shipping a fake search.
    await page.evaluate(() => {
      const input = document.createElement('input');

      input.dataset.promptlySearch = '';
      input.setAttribute('aria-label', 'Focus contract');
      document.querySelector('.desktop-content')?.append(input);
    });
    await page.getByRole('button', { name: 'Always on top', exact: true }).focus();
    await page.evaluate(() => window.promptly.setWindowVisibility({ visible: true }));
    await expect(page.getByRole('textbox', { name: 'Focus contract' })).toBeFocused();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect.poll(() => app.windows().length).toBe(2);
    const settingsPage = app.windows().find((candidate) => candidate.url().endsWith('#settings'));

    if (settingsPage === undefined) throw new Error('Settings window missing.');
    await expect(settingsPage.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await settingsPage.getByRole('switch', { name: 'Always on top' }).click();
    await expect(settingsPage.getByRole('switch', { name: 'Always on top' })).toBeChecked();
    await expect(page.locator('footer')).toContainText('Always on top');
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => window.isAlwaysOnTop())
      )
    ).toBe(true);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL().endsWith('#settings'))
        ?.setSize(500, 640)
    );
    await expect(settingsPage.locator('nav')).toHaveCSS('flex-direction', 'row');
    await expect(settingsPage.locator('.settings-field').first()).toHaveCSS(
      'flex-direction',
      'column'
    );
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL().endsWith('#settings'))
        ?.setSize(800, 640)
    );
    await expect(settingsPage.locator('nav')).toHaveCSS('flex-direction', 'column');
    await expect(settingsPage.locator('.settings-field').first()).toHaveCSS(
      'flex-direction',
      'row'
    );
    expect(
      await settingsPage.evaluate(() => window.promptly.updateSettings({ showInTray: false }))
    ).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    expect(
      await settingsPage.evaluate(() =>
        window.promptly.updateSettings({ openShortcut: 'Control+P' })
      )
    ).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    const csp = await settingsPage
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    expect(csp).not.toContain('unsafe-inline');
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("'nonce-");
    await settingsPage.close();
    await page.evaluate(() => window.promptly.openDesktopWindow({ kind: 'onboarding' }));
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL().endsWith('#onboarding'))
          ?.getSize()
      )
    ).toEqual([760, 510]);
    const quitting = app.waitForEvent('close');

    await page.getByRole('button', { name: 'Quit Promptly', exact: true }).click();
    await quitting;
  } finally {
    await isolated.dispose();
  }
});
