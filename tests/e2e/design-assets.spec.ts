import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

test('packaged fonts and logos load offline with native System colors and no fixture route', async () => {
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
    const remoteRequests: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) remoteRequests.push(request.url());
    });
    // Block actual HTTP transport without intercepting Electron's local file protocol.
    await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];

      if (window === undefined) throw new Error('Missing packaged window');
      window.webContents.session.webRequest.onBeforeRequest(
        { urls: ['http://*/*', 'https://*/*'] },
        (_request, callback) => {
          callback({ cancel: true });
        }
      );
    });
    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    const fonts = await page.evaluate(async () => {
      await Promise.all(
        [
          '400 13.5px "Space Grotesk"',
          '500 13.5px "Space Grotesk"',
          '600 22px "Space Grotesk"',
          '400 13px "Geist Mono"',
          '500 12px "Geist Mono"'
        ].map((font) => document.fonts.load(font))
      );

      return Array.from(document.fonts).map((font) => ({
        family: font.family,
        weight: font.weight,
        status: font.status
      }));
    });

    expect(fonts).toHaveLength(5);
    expect(fonts.every((font) => font.status === 'loaded')).toBe(true);
    await expect(page.locator('img.brand-light')).toHaveJSProperty('naturalWidth', 1024);
    await expect(page.locator('img.brand-dark')).toHaveJSProperty('naturalWidth', 1024);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.screenshot({ path: 'docs/verification/P06/packaged-light.png' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(9, 9, 11)');
    await page.screenshot({ path: 'docs/verification/P06/packaged-dark.png' });
    const assets = path.resolve('.vite/renderer/main_window/assets');
    const bundle = readdirSync(assets)
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFileSync(path.join(assets, file), 'utf8'))
      .join('\n');

    expect(bundle).not.toContain('Design foundation fixtures');
    expect(bundle).not.toContain('Open dialog fixture');
    expect(errors).toEqual([]);
    expect(remoteRequests).toEqual([]);
  } finally {
    await app.close();
  }
});
