import { expect, test } from '@playwright/test';

import { launchSettingsUiFixture, resizeSettings } from './settings-ui-fixture';

test('Settings matches the 639/640 breakpoint, preserves keyboard focus and renders all logical widths', async () => {
  const owned = await launchSettingsUiFixture();
  const { application, settings } = owned;

  try {
    for (const theme of ['light', 'dark'] as const) {
      await settings.getByRole('tab', { name: 'Appearance' }).click();
      await settings
        .getByRole('radiogroup', { name: 'Theme' })
        .getByText(theme === 'light' ? 'Light' : 'Dark', { exact: true })
        .click();
      await expect(settings.locator('html')).toHaveAttribute('data-theme', theme);
      for (const width of [440, 639, 640, 900]) {
        await resizeSettings(application, width);
        await expect.poll(() => settings.evaluate(() => window.innerWidth)).toBe(width);
        await expect(settings.getByRole('tablist')).toHaveAttribute(
          'aria-orientation',
          width < 640 ? 'horizontal' : 'vertical'
        );
        for (const section of ['General', 'Appearance']) {
          await settings.getByRole('tab', { name: section }).click();
          const body = await settings.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth
          }));

          expect(body.scroll).toBeLessThanOrEqual(body.width);
          const name = `${section.toLowerCase()}-${theme}-${String(width)}.png`;

          await settings.screenshot({ path: test.info().outputPath(name), scale: 'css' });
          await test
            .info()
            .attach(name, { path: test.info().outputPath(name), contentType: 'image/png' });
        }

        await expect(settings.locator('.settings-field').first()).toHaveCSS(
          'flex-direction',
          width < 640 ? 'column' : 'row'
        );
        await expect(settings.locator('.settings-field[data-inline="true"]').first()).toHaveCSS(
          'flex-direction',
          'row'
        );
      }
    }

    await resizeSettings(application, 639);
    await expect.poll(() => settings.evaluate(() => window.innerWidth)).toBe(639);
    await expect(settings.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal');
    const appearance = settings.getByRole('tab', { name: 'Appearance' });

    await appearance.focus();
    const identity = await appearance.getAttribute('id');

    await resizeSettings(application, 640);
    await expect.poll(() => settings.evaluate(() => window.innerWidth)).toBe(640);
    await expect(settings.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    await expect(appearance).toBeFocused();
    expect(await appearance.getAttribute('id')).toBe(identity);
    await appearance.press('ArrowDown');
    await expect(settings.getByRole('tab', { name: 'Tags' })).toBeFocused();
    await expect(settings.getByRole('tab', { name: 'Tags' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const tags = settings.getByRole('tab', { name: 'Tags' });
    const tagsNode = await tags.elementHandle();

    await resizeSettings(application, 639);
    await expect.poll(() => settings.evaluate(() => window.innerWidth)).toBe(639);
    await expect(settings.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(tags).toBeFocused();
    expect(await tags.evaluate((element, original) => element === original, tagsNode)).toBe(true);
    await tags.press('ArrowRight');
    await expect(settings.getByRole('tab', { name: 'Storage' })).toBeFocused();
    await expect(settings.getByRole('tab', { name: 'Storage' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await settings.getByRole('tab', { name: 'Storage' }).press('Home');
    await expect(settings.getByRole('tab', { name: 'General' })).toBeFocused();
    const csp = await settings
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    expect(csp).toContain("connect-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).toContain("'nonce-");
    expect(
      await settings.evaluate(() => {
        const unauthorized = document.createElement('style');

        unauthorized.textContent = '.settings-window { opacity: 0.13 !important }';
        document.head.append(unauthorized);
        const element = document.querySelector('.settings-window');

        if (element === null) throw new Error('Missing Settings shell.');
        return getComputedStyle(element).opacity;
      })
    ).toBe('1');
    expect(
      await settings
        .locator('.settings-back')
        .evaluate((element) => getComputedStyle(element).getPropertyValue('-webkit-app-region'))
    ).toBe('no-drag');
    expect(
      await settings
        .locator('header')
        .evaluate((element) => getComputedStyle(element).getPropertyValue('-webkit-app-region'))
    ).toBe('drag');
  } finally {
    await owned.dispose();
  }
});
