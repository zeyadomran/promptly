import { expect, test } from '@playwright/test';

import { seedCompactCorpus } from './compact-corpus';
import { launchSettingsUiFixture } from './settings-ui-fixture';

test('Compact library renders a real 10k paged corpus with bounded rows, keyboard selection and safe text', async () => {
  const owned = await launchSettingsUiFixture(false, undefined, false, seedCompactCorpus);
  const page = owned.main;

  try {
    expect(
      await owned.settings.evaluate(() => window.promptly.returnToMainWindow({}))
    ).toMatchObject({ ok: true });
    const search = page.getByRole('textbox', { name: 'Search snippets' });
    const list = page.getByRole('listbox', { name: 'Snippets' });

    await expect(search).toBeFocused();
    await expect(page.locator('.library-footer')).toContainText('10000 of 10000');
    await expect(page.getByRole('option').first()).toBeVisible();
    expect(await page.getByRole('option').count()).toBeLessThanOrEqual(20);
    expect(await page.locator('.library-row[style], .library-virtual-space[style]').count()).toBe(
      0
    );
    await search.fill('literal <script>');
    await expect(page.locator('.library-footer')).toContainText('1 of 10000');
    await expect(page.locator('.library-row-text')).toContainText('<script>alert(1)</script>');
    expect(await page.locator('.library-row-text script').count()).toBe(0);
    await expect(page.locator('.library-row-source')).toHaveText('chatgpt');
    await search.fill('');
    await expect(page.locator('.library-footer')).toContainText('10000 of 10000');
    await list.focus();
    for (let index = 0; index < 201; index += 1) await list.press('ArrowDown');
    const selected = page.getByRole('option', { selected: true });

    await expect(selected).toHaveAttribute('aria-posinset', '202');
    await expect(selected).toBeInViewport({ ratio: 1 });
    await expect(list).toBeFocused();
    await expect(selected).toHaveCSS('height', '78px');
    await list.evaluate((element) => {
      element.scrollTop = 720_000;
    });
    await expect
      .poll(() => page.getByRole('option').first().getAttribute('aria-posinset'))
      .toBe('8997');
    expect(await page.getByRole('option').count()).toBeLessThanOrEqual(20);
    const dimensions = await page.evaluate(() => {
      const space = document.querySelector('.library-virtual-space');

      if (space === null) throw new Error('Missing owned library scroll space.');
      return {
        width: window.innerWidth,
        scroll: document.documentElement.scrollWidth,
        height: Number.parseFloat(getComputedStyle(space).height)
      };
    });

    expect(dimensions.width).toBe(440);
    expect(dimensions.scroll).toBe(440);
    expect(dimensions.height).toBe(799_998);
    await search.fill('no-owned-snippet-matches');
    await expect(page.getByText('No snippets match your search.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search and filters' }).click();
    await expect(search).toBeFocused();
    await expect(page.locator('.library-footer')).toContainText('10000 of 10000');
  } finally {
    await owned.dispose();
  }
});
