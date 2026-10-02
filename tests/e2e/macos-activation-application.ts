import path from 'node:path';

import { type ElectronApplication, expect } from '@playwright/test';
import type { BrowserWindow } from 'electron';

import { launchIsolatedElectron } from '../isolated-electron';

export async function launchMacosActivationApplication() {
  const environment: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') environment[key] = value;
  }

  const executable = path.resolve(
    'out',
    `Promptly-darwin-${process.arch}`,
    'Promptly.app',
    'Contents',
    'MacOS',
    'Promptly'
  );

  return launchIsolatedElectron(executable, environment);
}

/** Window creation precedes ready-to-show; verify actual native/renderer readiness. */
export async function ownedActivationWindow(application: ElectronApplication): Promise<number> {
  const page = await application.firstWindow();

  await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
  await expect
    .poll(
      () =>
        application.evaluate(({ BrowserWindow }) => {
          const window = BrowserWindow.getAllWindows()[0];

          return window !== undefined && window.isVisible() && !window.webContents.isLoading();
        }),
      { timeout: 5000 }
    )
    .toBe(true);
  const owned = await application.browserWindow(page);

  return owned.evaluate((window: BrowserWindow) => window.id);
}
