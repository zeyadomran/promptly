import path from 'node:path';

import { expect, test } from '@playwright/test';
import type { WebContents, WebPreferences } from 'electron';

import { operations } from '../../src/shared/contracts/operations';
import { launchOwnedTransferPackage } from './storage-packaged-fixture';

interface InspectableWebContents extends WebContents {
  getLastWebPreferences(): WebPreferences;
}

test('packaged shell keeps offline assets, CSP and sandboxed IPC boundaries', async () => {
  const owned = await launchOwnedTransferPackage();
  const app = owned.application;
  let primary: unknown;

  try {
    const page = await app.firstWindow();

    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    expect(
      await page.evaluate(() => ({
        frozen: Object.isFrozen(window.promptly),
        bridgeKeys: Object.keys(window.promptly),
        node: ['require', 'process', 'Buffer', 'ipcRenderer'].filter((key) => key in window),
        csp: document
          .querySelector('meta[http-equiv="Content-Security-Policy"]')
          ?.getAttribute('content')
      }))
    ).toEqual({
      frozen: true,
      bridgeKeys: [
        'platform',
        ...Object.keys(operations),
        'subscribeWindowFocus',
        'subscribeChanges'
      ],
      node: [],
      csp: expect.stringContaining("connect-src 'none'")
    });
    const preferences = await app.evaluate(({ BrowserWindow }) =>
      (
        BrowserWindow.getAllWindows()[0]?.webContents as InspectableWebContents | undefined
      )?.getLastWebPreferences()
    );

    expect(preferences).toMatchObject({
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    });
    expect(
      await page.evaluate(() => window.promptly.getSnippet({ id: 'malformed' }))
    ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(await page.evaluate(() => window.open('https://example.com'))).toBeNull();
    const assets = await page.evaluate(async () => {
      await document.fonts.load('400 13px "Geist Mono"');
      await document.fonts.load('400 13.5px "Space Grotesk"');
      return {
        fonts:
          document.fonts.check('400 13px "Geist Mono"') &&
          document.fonts.check('400 13.5px "Space Grotesk"'),
        images: Array.from(document.images).every(
          (image) => image.complete && image.naturalWidth > 0
        )
      };
    });

    expect(assets).toEqual({ fonts: true, images: true });
    const unauthorizedPage = app.waitForEvent('window');

    await app.evaluate(
      async ({ BrowserWindow, app: nativeApp }, preloadSuffix) => {
        const window = new BrowserWindow({
          show: false,
          webPreferences: {
            preload: nativeApp.getAppPath() + preloadSuffix,
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false
          }
        });

        await window.loadURL('about:blank');
      },
      path.sep + path.join('.vite', 'build', 'preload.cjs')
    );
    const untrusted = await unauthorizedPage;

    expect(await untrusted.evaluate(() => window.promptly.getSettings({}))).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' }
    });
    await untrusted.close();
    expect(app.windows()).toHaveLength(1);
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    await owned.dispose(primary);
  }
});
