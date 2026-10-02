import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';
import { writeWindowReceipt } from './native-window-receipt';

test('packaged OS registration, conflict rollback, capture pause and owned recorder recovery', async () => {
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
    const initial = await page.evaluate(() => window.promptly.getShortcutStatus({}));
    const actual = await application.evaluate(({ globalShortcut }) =>
      globalShortcut.isRegistered('Alt+Space')
    );

    expect(initial).toMatchObject({
      ok: true,
      value: { open: actual ? 'registered' : 'unavailable', captureHandlerAvailable: false }
    });
    await writeWindowReceipt('shortcut-startup-registration', initial);
    expect(
      await page.evaluate(() =>
        window.promptly.updateSettings({
          openShortcut: 'Control+Alt+F10',
          pinShortcut: 'Control+Alt+F11',
          saveShortcut: { kind: 'combination', accelerator: 'Control+Alt+F12' }
        })
      )
    ).toMatchObject({ ok: true });
    const before = await page.evaluate(() => window.promptly.getSettings({}));

    expect(
      await application.evaluate(({ globalShortcut }) =>
        globalShortcut.register('Control+Alt+F9', () => undefined)
      )
    ).toBe(true);
    expect(
      await page.evaluate(() => window.promptly.updateSettings({ openShortcut: 'Control+Alt+F9' }))
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(await page.evaluate(() => window.promptly.getSettings({}))).toEqual(before);
    expect(
      await page.evaluate(() => window.promptly.updateSettings({ pinShortcut: 'Ctrl+Alt+F10' }))
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(
      await application.evaluate(({ globalShortcut }) =>
        globalShortcut.isRegistered('Control+Alt+F10')
      )
    ).toBe(true);
    await page.evaluate(() => window.promptly.setCapturePaused({ paused: true }));
    expect(await application.evaluate(({ globalShortcut }) => globalShortcut.isSuspended())).toBe(
      false
    );
    await page.evaluate(() => window.promptly.setShortcutRecording({ active: true }));
    expect(await application.evaluate(({ globalShortcut }) => globalShortcut.isSuspended())).toBe(
      true
    );
    await application.evaluate(({ powerMonitor }) => {
      powerMonitor.emit('suspend');
    });
    await expect
      .poll(() => page.evaluate(() => window.promptly.getShortcutStatus({})))
      .toMatchObject({ ok: true, value: { hook: 'suspended', recording: true } });
    await application.evaluate(({ powerMonitor }) => {
      powerMonitor.emit('resume');
    });
    await expect
      .poll(() => page.evaluate(() => window.promptly.getShortcutStatus({})))
      .toMatchObject({ ok: true, value: { hook: 'installed', recording: true } });
    expect(await application.evaluate(({ globalShortcut }) => globalShortcut.isSuspended())).toBe(
      true
    );
    expect(
      await page.evaluate(() => window.promptly.updateSettings({ openShortcut: 'Control+Alt+F8' }))
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    expect(await application.evaluate(({ globalShortcut }) => globalShortcut.isSuspended())).toBe(
      false
    );
    expect(await page.evaluate(() => window.promptly.getShortcutStatus({}))).toMatchObject({
      ok: true,
      value: { recording: false, capturePaused: true }
    });
    await page.evaluate(() => window.promptly.setCapturePaused({ paused: false }));
    expect(await page.evaluate(() => window.promptly.getShortcutStatus({}))).toMatchObject({
      ok: true,
      value: { captureHandlerAvailable: false }
    });
  } finally {
    await application
      .evaluate(({ globalShortcut }) => {
        globalShortcut.unregister('Control+Alt+F9');
      })
      .catch(() => undefined);
    await isolated.dispose();
  }
});
