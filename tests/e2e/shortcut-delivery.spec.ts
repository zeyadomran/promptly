import { expect, test } from '@playwright/test';

import { writeWindowReceipt } from './native-window-receipt';
import { createShortcutDriver } from './shortcut-driver';
import { launchOwnedTransferPackage } from './storage-packaged-fixture';

test('real OS shortcut delivery toggles visibility and persists pin while capture is paused', async () => {
  test.skip(
    process.env['CI'] !== 'true' ||
      process.env['GITHUB_ACTIONS'] !== 'true' ||
      process.env['RUNNER_ENVIRONMENT'] !== 'github-hosted' ||
      process.env['RUNNER_OS'] !== (process.platform === 'darwin' ? 'macOS' : 'Windows'),
    'Native input is restricted to owned GitHub-hosted runners.'
  );
  const owned = await launchOwnedTransferPackage();
  const application = owned.application;
  let receiptPage: Awaited<ReturnType<typeof application.firstWindow>> | undefined;
  let failure: unknown;

  try {
    const page = await application.firstWindow();

    receiptPage = page;

    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    expect(
      await page.evaluate(
        (macos) =>
          window.promptly.updateSettings({
            openShortcut: macos ? 'Control+Alt+J' : 'Control+Alt+F10',
            pinShortcut: macos ? 'Control+Alt+K' : 'Control+Alt+F11',
            saveShortcut: { kind: 'combination', accelerator: 'Control+Alt+F12' }
          }),
        process.platform === 'darwin'
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
  } catch (error) {
    failure = error;
  }

  const cleanupErrors: unknown[] = [];

  try {
    if (receiptPage !== undefined)
      await writeWindowReceipt('shortcut-final', {
        settings: await receiptPage.evaluate(() => window.promptly.getSettings({})),
        window: await receiptPage.evaluate(() => window.promptly.getWindowState({}))
      });
  } catch (error) {
    cleanupErrors.push(error);
  }

  try {
    await owned.dispose(failure);
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (cleanupErrors.length > 0)
    throw new AggregateError(
      failure === undefined ? cleanupErrors : [failure, ...cleanupErrors],
      'Owned shortcut fixture cleanup failed.'
    );

  if (failure !== undefined)
    throw failure instanceof Error
      ? failure
      : new Error('Owned shortcut flow failed.', { cause: failure });
});
