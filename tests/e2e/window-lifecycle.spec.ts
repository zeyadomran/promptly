import { spawn } from 'node:child_process';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';
import { expectedRegularRestore, geometryReceipt } from './window-geometry';
import { beginVisibilityReceipt, expectConcealed, visibilityReceipt } from './window-visibility';

test('packaged modes, pin, recovery, display clamp and restart use durable independent geometry', async () => {
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
  let app = isolated.application;

  try {
    const page = await app.firstWindow();

    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    await beginVisibilityReceipt(app);
    expect(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getBounds().width)
    ).toBe(440);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('radio', { name: 'Regular', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getBounds().width)
      )
      .toBe(1000);
    const { area } = await geometryReceipt(app, 'regular-before-resize');

    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setBounds({ width: 1100, height: 700 })
    );
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getBounds().width)
      )
      .toBeGreaterThanOrEqual(Math.min(1100, area.width));
    const { bounds: regular } = await geometryReceipt(app, 'regular-after-resize');
    const restoredRegular = expectedRegularRestore(regular, area);

    await page.getByRole('radio', { name: 'Compact', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getBounds().width)
      )
      .toBe(440);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setBounds({ height: 590 })
    );
    await page.getByRole('button', { name: 'Always on top', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Always on top', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('footer')).toContainText('Always on top');
    expect(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isAlwaysOnTop())
    ).toBe(true);
    const snapshot = await page.evaluate(() => window.promptly.getSettings({}));

    expect(snapshot).toMatchObject({
      ok: true,
      value: { settings: { defaultSizeMode: 'compact', rememberedBounds: { regular } } }
    });
    await page.evaluate(() => window.promptly.setShortcutRecording({ active: true }));
    const beforeHide = await visibilityReceipt(app, 'before-hide');

    expect(beforeHide.visible).toBe(true);
    await page.evaluate(() => window.promptly.setWindowVisibility({ visible: false }));
    await expectConcealed(app, 'after-hide', beforeHide.dock);
    const child = spawn(executable, [`--user-data-dir=${isolated.profile}`], {
      env,
      windowsHide: true
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Second launch did not exit.'));
      }, 10_000);

      child.once('error', reject);
      child.once('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error(`Second launch exited ${String(code)}.`));
      });
    });
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => {
          const window = BrowserWindow.getAllWindows()[0];

          return (
            BrowserWindow.getAllWindows().length === 1 &&
            window?.isVisible() === true &&
            !window.isMinimized()
          );
        })
      )
      .toBe(true);
    await page.getByRole('radio', { name: 'Regular', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getBounds())
      )
      .toEqual(restoredRegular);
    await geometryReceipt(app, 'regular-restored');
    await app.evaluate(({ BrowserWindow, screen }) => {
      BrowserWindow.getAllWindows()[0]?.setBounds({ x: -50_000, y: -50_000 });
      screen.emit('display-metrics-changed');
    });
    expect(
      await app.evaluate(({ BrowserWindow, screen }) => {
        const bounds = BrowserWindow.getAllWindows()[0]?.getBounds();

        return (
          bounds !== undefined &&
          screen
            .getAllDisplays()
            .some(
              ({ workArea }) =>
                bounds.x >= workArea.x &&
                bounds.y >= workArea.y &&
                bounds.x + bounds.width <= workArea.x + workArea.width &&
                bounds.y + bounds.height <= workArea.y + workArea.height
            )
        );
      })
    ).toBe(true);
    app = await isolated.restart();
    await beginVisibilityReceipt(app);
    const reopened = await app.firstWindow();

    await expect(reopened.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    expect(
      await app.evaluate(({ BrowserWindow }) => ({
        width: BrowserWindow.getAllWindows()[0]?.getBounds().width,
        height: BrowserWindow.getAllWindows()[0]?.getBounds().height,
        pinned: BrowserWindow.getAllWindows()[0]?.isAlwaysOnTop()
      }))
    ).toEqual({ width: 440, height: 590, pinned: true });
    await expect(
      reopened.getByRole('button', { name: 'Always on top', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    const recovery = await visibilityReceipt(app, 'before-close');

    expect(
      await reopened.evaluate(() => window.promptly.setShortcutRecording({ active: true }))
    ).toMatchObject({ ok: true, value: { recording: true } });

    const hidesOnClose = process.platform === 'darwin' && recovery.dock;
    const closing = hidesOnClose ? undefined : app.waitForEvent('close');

    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.close();
    });
    if (hidesOnClose) {
      await expectConcealed(app, 'after-close', recovery.dock);
      await app.evaluate(({ app: nativeApp }) => {
        nativeApp.emit('activate');
      });
      await expect
        .poll(() =>
          app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible())
        )
        .toBe(true);
    } else await closing;
  } finally {
    await isolated.dispose();
  }
});
