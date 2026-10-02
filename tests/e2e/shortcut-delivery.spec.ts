import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';
import { createShortcutDriver } from './shortcut-driver';

test('real OS shortcut delivery toggles visibility and persists pin while capture is paused', async () => {
  const executable = path.resolve(
    'out',
    `Promptly-${process.platform}-${process.arch}`,
    process.platform === 'darwin' ? 'Promptly.app/Contents/MacOS/Promptly' : 'Promptly.exe'
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
    expect(
      await page.evaluate(() =>
        window.promptly.updateSettings({
          openShortcut: 'Control+Alt+F10',
          pinShortcut: 'Control+Alt+F11',
          saveShortcut: { kind: 'combination', accelerator: 'Control+Alt+F12' }
        })
      )
    ).toMatchObject({ ok: true });
    await page.evaluate(() => window.promptly.setCapturePaused({ paused: true }));
    await application.evaluate(({ BrowserWindow }) => {
      new BrowserWindow({
        title: 'Promptly shortcut fixture',
        width: 320,
        height: 240,
        webPreferences: { sandbox: true, nodeIntegration: false }
      }).focus();
    });
    const send = await createShortcutDriver(application);

    expect(await send('pin')).toEqual({
      status: 'sent',
      ownedForeground: true,
      keysInjected: true
    });
    await expect
      .poll(() => page.evaluate(() => window.promptly.getSettings({})))
      .toMatchObject({ ok: true, value: { settings: { alwaysOnTop: true } } });
    expect(await send('open')).toEqual({
      status: 'sent',
      ownedForeground: true,
      keysInjected: true
    });
    await expect
      .poll(() => page.evaluate(() => window.promptly.getWindowState({})))
      .toMatchObject({ ok: true, value: { visible: false } });
    expect(await send('open')).toEqual({
      status: 'sent',
      ownedForeground: true,
      keysInjected: true
    });
    await expect
      .poll(() => page.evaluate(() => window.promptly.getWindowState({})))
      .toMatchObject({ ok: true, value: { visible: true } });
    await page.evaluate(() => window.promptly.setCapturePaused({ paused: false }));
    expect(await send('capture')).toEqual({
      status: 'sent',
      ownedForeground: true,
      keysInjected: true
    });
    expect(await page.evaluate(() => window.promptly.getShortcutStatus({}))).toMatchObject({
      ok: true,
      value: { captureHandlerAvailable: false }
    });
  } finally {
    await isolated.dispose();
  }
});
