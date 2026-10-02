import { expect, test } from '@playwright/test';

import { launchOwnedTransferPackage } from './storage-packaged-fixture';

// Same production shell on both OSes; the wrapper restores hosted OS preferences after drain.
test('Settings saves and reopens preferences, reports native outcome and preserves breakpoint focus', async () => {
  const owned = await launchOwnedTransferPackage();
  let primary: unknown;

  try {
    let app = owned.application;
    let main = await app.firstWindow();

    await main.evaluate(() => window.promptly.openDesktopWindow({ kind: 'settings' }));
    let settings = app.windows().find((page) => page.url().endsWith('#settings'));

    if (settings === undefined) throw new Error('Missing Settings window');
    const native = await settings.evaluate(() =>
      window.promptly.updateSettings({ launchAtLogin: true })
    );
    const login = settings.getByRole('switch', { name: 'Launch at login' });

    if (native.ok) {
      await expect(login).toBeChecked();
      expect(
        await app.evaluate(({ app: nativeApp }) => nativeApp.getLoginItemSettings().openAtLogin)
      ).toBe(true);
    } else {
      expect(native.error.code).toBe('CONFLICT');
      await expect(login).not.toBeChecked();
    }

    await settings.getByRole('tab', { name: 'Appearance' }).click();
    await settings
      .getByRole('radiogroup', { name: 'Theme' })
      .getByText('Dark', { exact: true })
      .click();
    await expect(main.locator('html')).toHaveAttribute('data-theme', 'dark');
    await owned.restart();
    app = owned.application;
    main = await app.firstWindow();
    await main.evaluate(() => window.promptly.openDesktopWindow({ kind: 'settings' }));
    settings = app.windows().find((page) => page.url().endsWith('#settings'));
    if (settings === undefined) throw new Error('Settings did not reopen');
    expect(await settings.evaluate(() => window.promptlyInitialSettings)).toMatchObject({
      settings: { theme: 'dark' }
    });
    const resize = async (width: number) => {
      await app.evaluate(
        ({ BrowserWindow }, value) =>
          BrowserWindow.getAllWindows()
            .find((window) => window.webContents.getURL().endsWith('#settings'))
            ?.setContentSize(value, 580),
        width
      );
      await expect.poll(() => settings.evaluate(() => innerWidth)).toBe(width);
      await expect(settings.getByRole('tablist')).toHaveAttribute(
        'aria-orientation',
        width >= 640 ? 'vertical' : 'horizontal'
      );
    };

    await resize(640);
    const tags = settings.getByRole('tab', { name: 'Tags' });

    await tags.focus();
    const original = await tags.elementHandle();

    await resize(639);
    await expect(tags).toBeFocused();
    expect(await tags.evaluate((element, previous) => element === previous, original)).toBe(true);
    await tags.press('ArrowRight');
    await expect(settings.getByRole('tab', { name: 'Storage' })).toBeFocused();
    await expect(settings.getByRole('tab', { name: 'Storage' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await settings.getByRole('button', { name: 'Back to Promptly' }).click();
    await expect.poll(() => app.windows().length).toBe(1);
    expect(await main.evaluate(() => window.promptly.getWindowState({}))).toMatchObject({
      ok: true,
      value: { visible: true }
    });
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    await owned.dispose(primary);
  }
});
