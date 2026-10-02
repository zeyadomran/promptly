import path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';
import type { WebContents, WebPreferences } from 'electron';

interface InspectableWebContents extends WebContents {
  getLastWebPreferences(): WebPreferences;
}

test('packaged React window preserves the sandboxed preload boundary', async () => {
  const directory = path.resolve('out', `Promptly-${process.platform}-${process.arch}`);
  const executablePath =
    process.platform === 'darwin'
      ? path.join(directory, 'Promptly.app', 'Contents', 'MacOS', 'Promptly')
      : path.join(directory, 'Promptly.exe');
  // ELECTRON_RUN_AS_NODE can be inherited from the agent host; never pass it to Electron.
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }

  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath, env, timeout: 20_000 });

  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];

    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText(
      process.platform === 'darwin' ? 'macOS' : 'Windows'
    );
    expect(
      await page.evaluate(() => ({
        platform: window.promptly.platform,
        bridgeKeys: Object.keys(window.promptly),
        frozen: Object.isFrozen(window.promptly),
        node: ['require', 'process', 'Buffer', 'ipcRenderer'].filter((key) => key in window),
        csp: document
          .querySelector('meta[http-equiv="Content-Security-Policy"]')
          ?.getAttribute('content')
      }))
    ).toEqual({
      platform: process.platform,
      bridgeKeys: ['platform'],
      frozen: true,
      node: [],
      csp: expect.stringContaining("connect-src 'none'")
    });
    const preferences = await app.evaluate(({ BrowserWindow }) => {
      // Electron's internal inspection method is intentionally used only in this smoke test.
      const contents = BrowserWindow.getAllWindows()[0]?.webContents as
        InspectableWebContents | undefined;

      return contents?.getLastWebPreferences();
    });

    expect(preferences).toMatchObject({
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    });
    expect(await page.evaluate(() => window.open('https://example.com'))).toBeNull();
    expect(app.windows()).toHaveLength(1);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
  }
});
