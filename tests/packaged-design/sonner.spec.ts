import path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

test('packaged Radix and Sonner render with exact-hash CSP and blocked network', async () => {
  const directory = path.resolve('out', `Promptly-${process.platform}-${process.arch}`);
  const executablePath =
    process.platform === 'darwin'
      ? path.join(directory, 'Promptly.app', 'Contents', 'MacOS', 'Promptly')
      : path.join(directory, 'Promptly.exe');
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  }

  const app = await electron.launch({ executablePath, env });

  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    const violations: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') violations.push(message.text());
    });
    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    await app.evaluate(async ({ BrowserWindow, app: desktopApp }) => {
      const window = BrowserWindow.getAllWindows()[0];

      if (window === undefined) throw new Error('Missing packaged window');
      window.webContents.session.webRequest.onBeforeRequest(
        { urls: ['http://*/*', 'https://*/*'] },
        (_request, callback) => {
          callback({ cancel: true });
        }
      );
      await window.loadFile(`${desktopApp.getAppPath()}/.vite/renderer/main_window/index.html`, {
        hash: 'design',
        search: 'fixture=1'
      });
    });
    await expect(page.getByRole('heading', { name: 'Design foundation fixtures' })).toBeVisible();
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    expect(csp).toContain("style-src 'self' 'sha256-");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).toContain("'nonce-");
    await page.getByRole('radio', { name: 'Dark', exact: true }).click();
    await page.getByRole('button', { name: 'Show toast fixture' }).click();
    const toast = page.locator('[data-sonner-toast]');

    await expect(toast).toBeVisible();
    await expect(toast).toHaveCSS('position', 'absolute');
    await expect(toast).toHaveCSS('background-color', 'rgb(9, 9, 11)');
    await expect(page.getByRole('button', { name: 'Show toast fixture' })).toBeFocused();
    await page.screenshot({
      path: 'docs/verification/P06/packaged-sonner-dark.png',
      fullPage: true
    });
    await expect(toast).not.toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Open dialog fixture' }).click();
    await expect(page.getByRole('dialog', { name: 'Accessible overlay fixture' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Focusable action' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(errors).toEqual([]);
    expect(violations).toEqual([]);
  } finally {
    await app.close();
  }
});
