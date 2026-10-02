import { expect, test } from '@playwright/test';

test('themes, local assets, keyboard interactions and reference measurements', async ({ page }) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5173') && !request.url().startsWith('data:'))
      remoteRequests.push(request.url());
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#design');
  await expect(page.getByRole('heading', { name: 'Design foundation fixtures' })).toBeVisible();
  const compact = page.getByRole('region', { name: 'Compact component fixture' });

  await expect(compact).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const fonts = await page.evaluate(async () => {
    const requests = [
      '400 13.5px "Space Grotesk"',
      '500 13.5px "Space Grotesk"',
      '600 22px "Space Grotesk"',
      '400 13px "Geist Mono"',
      '500 12px "Geist Mono"'
    ];

    await Promise.all(requests.map((font) => document.fonts.load(font)));

    return Array.from(document.fonts).map((font) => ({
      family: font.family,
      weight: font.weight,
      status: font.status
    }));
  });

  expect(fonts).toHaveLength(5);
  expect(fonts.every((font) => font.status === 'loaded')).toBe(true);
  expect(await compact.evaluate((node) => node.getBoundingClientRect().width)).toBe(440);
  const measurements = await compact.evaluate((node) => {
    const key = node.querySelector('kbd');
    const dot = node.querySelector('[aria-hidden="true"].rounded-\\[2px\\]');

    return {
      font: getComputedStyle(node).fontFamily,
      keyFont: key === null ? '' : getComputedStyle(key).fontFamily,
      keyRadius: key === null ? '' : getComputedStyle(key).borderRadius,
      dotWidth: dot?.getBoundingClientRect().width
    };
  });

  expect(measurements.font).toContain('Space Grotesk');
  expect(measurements.keyFont).toContain('Geist Mono');
  expect(measurements.keyRadius).toBe('4px');
  expect(measurements.dotWidth).toBe(6);
  await page.screenshot({ path: 'docs/verification/P06/fixtures-light-wide.png', fullPage: true });
  await page.getByRole('radio', { name: 'Dark', exact: true }).click();
  await expect(compact).toHaveCSS('background-color', 'rgb(9, 9, 11)');
  await expect(compact.locator('[data-slot="badge"]').first()).toHaveCSS('color', 'rgb(9, 9, 11)');
  await expect(page.getByRole('button', { name: 'Always on top', exact: true })).toHaveCSS(
    'transition-property',
    'transform, opacity'
  );
  await expect(page.getByLabel('Search fixture')).toHaveCSS(
    'transition-property',
    'transform, opacity'
  );
  await page.screenshot({ path: 'docs/verification/P06/fixtures-dark-wide.png', fullPage: true });
  await page.getByRole('radio', { name: 'System', exact: true }).click();
  await expect(compact).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(compact).toHaveCSS('background-color', 'rgb(9, 9, 11)');
  await page.getByRole('radio', { name: 'Light', exact: true }).click();
  await expect(compact).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.emulateMedia({ colorScheme: 'light' });
  const pin = page.getByRole('button', { name: 'Always on top', exact: true });

  await pin.focus();
  await expect(page.getByRole('tooltip')).toContainText('Always on top');
  await page.keyboard.press('Space');
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('switch', { name: 'Show confirmation toast' }).focus();
  await expect(page.getByRole('slider', { name: 'Double-tap window' })).toHaveAccessibleDescription(
    'Max time between taps'
  );
  await page.keyboard.press('Space');
  await expect(page.getByRole('switch', { name: 'Show confirmation toast' })).not.toBeChecked();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Open dialog fixture' });

  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Accessible overlay fixture' });

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Focusable action' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Show toast fixture' }).click();
  await expect(page.getByText('Saved to Promptly')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show toast fixture' })).toBeFocused();
  await page.setViewportSize({ width: 440, height: 1400 });
  await expect(page.getByLabel('Open Promptly')).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P06/fixtures-light-narrow.png',
    fullPage: true
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(440);
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test('native CSS paints system theme with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' });
  const page = await context.newPage();

  try {
    await page.goto('http://127.0.0.1:5173');
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(9, 9, 11)');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  } finally {
    await context.close();
  }
});
