import path from 'node:path';

import { type ElectronApplication, expect, type Page, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';
import { beginVisibilityReceipt, expectConcealed, visibilityReceipt } from './window-visibility';

async function expectPin(
  application: ElectronApplication,
  page: Page,
  pinned: boolean,
  dock: boolean
) {
  expect(
    await page.evaluate((alwaysOnTop) => window.promptly.updateSettings({ alwaysOnTop }), pinned)
  ).toMatchObject({ ok: true });
  const receipt = await visibilityReceipt(
    application,
    `dock-${String(dock)}-pin-${String(pinned)}`
  );

  expect(receipt.dock).toBe(dock);
  expect(receipt.pinned).toBe(pinned);
  expect(receipt.allWorkspaces).toBe(pinned);
}

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
    await expectPin(application, page, true, true);
    await expectPin(application, page, false, true);
    await page.evaluate(() => window.promptly.setWindowVisibility({ visible: false }));
    await expectConcealed(application, 'dock-enabled-after-hide', true);
    expect(
      await page.evaluate(() => window.promptly.updateSettings({ showDockIcon: false }))
    ).toMatchObject({ ok: true });
    const unavailable = await visibilityReceipt(application, 'dock-disabled-before-hide');

    expect(unavailable.dock).toBe(false);
    expect(unavailable.visible).toBe(true);
    await expectPin(application, page, true, false);
    await expectPin(application, page, false, false);
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
