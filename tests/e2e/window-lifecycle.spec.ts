import { expect, test } from '@playwright/test';

import { launchOwnedTransferPackage } from './storage-packaged-fixture';
import { expectedRegularRestore, geometryReceipt } from './window-geometry';
import { beginVisibilityReceipt, expectConcealed, visibilityReceipt } from './window-visibility';

test('packaged modes, pin, recovery and quit preserve independent durable geometry', async () => {
  const isolated = await launchOwnedTransferPackage();
  let app = isolated.application;

  let primary: unknown;

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
    await page.evaluate(() => window.promptly.setWindowVisibility({ visible: true }));
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible())
      )
      .toBe(true);
    await page.getByRole('radio', { name: 'Regular', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getBounds())
      )
      .toEqual(restoredRegular);
    await geometryReceipt(app, 'regular-restored');
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

    if (hidesOnClose) {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.close();
      });
      await expectConcealed(app, 'after-close', recovery.dock);
      await app.evaluate(({ app: nativeApp }) => {
        nativeApp.emit('activate');
      });
      await expect
        .poll(() =>
          app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible())
        )
        .toBe(true);
    }

    const closing = app.waitForEvent('close');

    expect(await reopened.evaluate(() => window.promptly.quitApplication({}))).toMatchObject({
      ok: true
    });
    await closing;
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    await isolated.dispose(primary);
  }
});
