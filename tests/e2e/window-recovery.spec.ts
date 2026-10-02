import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';
import { beginVisibilityReceipt, expectConcealed, visibilityReceipt } from './window-visibility';

test('a failed settings renderer is destroyed and the next open loads a fresh window', async () => {
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
  const application = isolated.application;

  try {
    const page = await application.firstWindow();

    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    await application.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows()[0];

      if (main === undefined) throw new Error('Missing owned main window.');
      main.webContents.session.webRequest.onBeforeRequest(
        { urls: ['file://*/*'] },
        (request, next) => {
          next({ cancel: request.webContentsId !== main.webContents.id });
        }
      );
    });
    expect(
      await page.evaluate(() => window.promptly.openDesktopWindow({ kind: 'settings' }))
    ).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    expect(
      await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
    ).toBe(1);
    await application.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.session.webRequest.onBeforeRequest(null);
    });
    expect(
      await page.evaluate(() => window.promptly.openDesktopWindow({ kind: 'settings' }))
    ).toMatchObject({ ok: true });
    const settings = application.windows().find((window) => window.url().endsWith('#settings'));

    if (settings === undefined) throw new Error('Missing recovered settings window.');
    await expect(settings.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    expect(
      await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
    ).toBe(2);
  } finally {
    await isolated.dispose();
  }
});

test('macOS uses a real Dock recovery route and keeps a reachable window after disabling it', async () => {
  test.skip(process.platform !== 'darwin', 'macOS Dock contract');
  const executable = path.resolve(
    'out',
    `Promptly-${process.platform}-${process.arch}`,
    'Promptly.app',
    'Contents',
    'MacOS',
    'Promptly'
  );
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE'
    )
  );
  const isolated = await launchIsolatedElectron(executable, env);
  const application = isolated.application;

  try {
    const page = await application.firstWindow();

    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    await beginVisibilityReceipt(application);
    expect(
      await page.evaluate(() => window.promptly.updateSettings({ showDockIcon: true }))
    ).toMatchObject({ ok: true });
    const available = await visibilityReceipt(application, 'dock-enabled-before-hide');

    expect(available.dock).toBe(true);
    await page.evaluate(() => window.promptly.setWindowVisibility({ visible: false }));
    await expectConcealed(application, 'dock-enabled-after-hide', true);
    expect(
      await page.evaluate(() => window.promptly.updateSettings({ showDockIcon: false }))
    ).toMatchObject({ ok: true });
    const unavailable = await visibilityReceipt(application, 'dock-disabled-before-hide');

    expect(unavailable.dock).toBe(false);
    expect(unavailable.visible).toBe(true);
    await page.evaluate(() => window.promptly.setWindowVisibility({ visible: false }));
    await expectConcealed(application, 'dock-disabled-after-hide', false);
    await page.evaluate(() => window.promptly.setWindowVisibility({ visible: true }));
    const reachable = await visibilityReceipt(application, 'dock-disabled-after-show');

    expect(reachable.dock).toBe(false);
    expect(reachable.visible).toBe(true);
  } finally {
    await isolated.dispose();
  }
});
