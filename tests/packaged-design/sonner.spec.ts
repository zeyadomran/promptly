import path from 'node:path';

import { expect, test } from '@playwright/test';

import { assertHighlightPaint } from '../e2e/assert-highlight-paint';
import { launchIsolatedElectron } from '../isolated-electron';

test('packaged libraries render under CSP while unauthorized styles are rejected', async () => {
  const directory = path.resolve('out', `Promptly-${process.platform}-${process.arch}`);
  const executablePath =
    process.platform === 'darwin'
      ? path.join(directory, 'Promptly.app', 'Contents', 'MacOS', 'Promptly')
      : path.join(directory, 'Promptly.exe');
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  }

  const isolated = await launchIsolatedElectron(executablePath, env);
  const app = isolated.application;
  let firstNonce: string | undefined;
  let firstExit: Awaited<ReturnType<typeof isolated.dispose>> | undefined;

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
    firstNonce = await page.evaluate(() => window.promptlyStyleNonce);
    if (firstNonce === undefined) throw new Error('Missing packaged style nonce');
    expect(firstNonce).toMatch(/^[A-Za-z0-9+/]{24}$/u);
    expect(csp).toContain(`'nonce-${firstNonce}'`);
    expect(csp).not.toContain('__PROMPTLY_STYLE_NONCE__');
    const deniedAsset = await app.evaluate(async ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];

      if (window === undefined) throw new Error('Missing packaged window');
      const outside = new URL('../../../package.json', window.webContents.getURL());
      const response = await window.webContents.session.fetch(outside.href);

      return response.status;
    });

    expect(deniedAsset).toBe(403);
    await page.getByRole('radio', { name: 'Light', exact: true }).click();
    const highlighted = page
      .getByRole('region', { name: 'Compact component fixture' })
      .locator('p')
      .filter({ hasText: 'Read the failing tests first' });
    const lightHighlight = await assertHighlightPaint(page, highlighted);

    await page.getByRole('radio', { name: 'Dark', exact: true }).click();
    const darkHighlight = await assertHighlightPaint(page, highlighted);

    expect(darkHighlight).not.toBe(lightHighlight);
    await page.getByRole('button', { name: 'Show toast fixture' }).click();
    const toast = page.locator('[data-sonner-toast]');

    await expect(toast).toBeVisible();
    await expect(toast).toHaveCSS('position', 'absolute');
    await expect(toast).toHaveCSS('background-color', 'rgb(9, 9, 11)');
    await expect(toast).toHaveCSS('font-family', '"Space Grotesk", sans-serif');
    await expect(toast).toHaveCSS('width', '290px');
    await expect(page.getByRole('button', { name: 'Show toast fixture' })).toBeFocused();
    await toast.screenshot({ path: 'docs/verification/P06/packaged-sonner-dark.png' });
    await expect(toast).not.toBeVisible({ timeout: 5000 });
    const trigger = page.getByRole('button', { name: 'Open dialog fixture' });

    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Accessible overlay fixture' });

    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Focusable action' })).toBeFocused();
    expect(
      await page.locator('style[nonce]').evaluateAll((styles) => styles.map((style) => style.nonce))
    ).toContain(firstNonce);
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
    await expect(page.getByRole('tooltip')).toHaveText('Close');
    await page.keyboard.press('Enter');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await trigger.click();
    await expect(page.getByRole('button', { name: 'Focusable action' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Close', exact: true }).hover();
    await expect(page.getByRole('tooltip')).toHaveText('Close');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await trigger.click();
    await expect(page.getByRole('button', { name: 'Focusable action' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
    expect(violations).toEqual([]);
    const rejected = await page.evaluate(async () => {
      const violation = new Promise<string>((resolve) => {
        document.addEventListener(
          'securitypolicyviolation',
          (event) => {
            resolve(event.effectiveDirective);
          },
          { once: true }
        );
      });
      const unauthorized = document.createElement('style');

      unauthorized.textContent = 'body { --unauthorized-style: injected; }';
      document.head.append(unauthorized);
      return {
        directive: await violation,
        applied: getComputedStyle(document.body).getPropertyValue('--unauthorized-style')
      };
    });

    expect(rejected.directive).toBe('style-src-elem');
    expect(rejected.applied).toBe('');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('Content Security Policy');
  } finally {
    firstExit = await isolated.dispose();
  }

  expect(firstExit).toMatchObject({ status: 'closed', exitCode: 0 });

  const secondIsolation = await launchIsolatedElectron(executablePath, env);
  const secondApp = secondIsolation.application;
  let secondExit: Awaited<ReturnType<typeof secondIsolation.dispose>> | undefined;

  try {
    const page = await secondApp.firstWindow();

    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    const nextNonce = await page.evaluate(() => window.promptlyStyleNonce);

    expect(nextNonce).toMatch(/^[A-Za-z0-9+/]{24}$/u);
    expect(nextNonce).not.toBe(firstNonce);
  } finally {
    secondExit = await secondIsolation.dispose();
  }

  expect(secondExit).toMatchObject({ status: 'closed', exitCode: 0 });
});
