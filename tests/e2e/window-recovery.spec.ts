import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';

type HeldRendererRequest = typeof globalThis & {
  heldRenderer?: (reply: { cancel: boolean }) => void;
};

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

test('closing an owned auxiliary window during a held renderer load releases open and permits retry', async () => {
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
          if (request.webContentsId === main.webContents.id) next({ cancel: false });
          else (globalThis as HeldRendererRequest).heldRenderer = next;
        }
      );
    });
    const opening = page.evaluate(() => window.promptly.openDesktopWindow({ kind: 'settings' }));
    const failed = expect(opening).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });

    await expect
      .poll(() =>
        application.evaluate(() => (globalThis as HeldRendererRequest).heldRenderer !== undefined)
      )
      .toBe(true);
    await application.evaluate(({ BrowserWindow }) => {
      const held = globalThis as HeldRendererRequest;
      const main = BrowserWindow.getAllWindows().find((window) => window.getTitle() === 'Promptly');
      const auxiliary = BrowserWindow.getAllWindows().find(
        (window) => window.getTitle() === 'Settings'
      );

      if (auxiliary === undefined) throw new Error('Missing owned pending settings window.');
      auxiliary.destroy();
      held.heldRenderer?.({ cancel: true });
      delete held.heldRenderer;
      main?.webContents.session.webRequest.onBeforeRequest(null);
    });
    await failed;
    expect(
      await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
    ).toBe(1);
    expect(
      await page.evaluate(() => window.promptly.openDesktopWindow({ kind: 'settings' }))
    ).toMatchObject({ ok: true });
    const settings = application.windows().find((window) => window.url().endsWith('#settings'));

    if (settings === undefined) throw new Error('Missing fresh retry window.');
    await expect(settings.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  } finally {
    await isolated.dispose();
  }
});
