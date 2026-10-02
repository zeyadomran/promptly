import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function assertCompleteHighlights(page: Page): Promise<number> {
  const text = `b ${'a '.repeat(700)}b uniquehighlight`;
  const query = 'a b uniquehighlight';

  await page.evaluate(async (updatedText) => {
    await window.promptly.updateSnippet({
      id: '00000000-0000-4000-8000-000000000000',
      text: updatedText
    });
  }, text);
  await page.getByRole('textbox', { name: 'Search' }).fill(query);
  await expect(page.getByTestId('paint')).toHaveAttribute('data-query', query);
  const duration = Number(await page.getByTestId('paint').textContent());
  const selected = page.getByRole('complementary', { name: 'Selected full text' });

  await expect(selected).toBeInViewport({ ratio: 1 });
  await expect(selected.locator('pre')).toHaveText(text);
  await expect(selected.locator('mark')).toHaveCount(703);
  await expect(selected.locator('mark').first()).toHaveText('b');
  await expect(selected.locator('mark').nth(701)).toHaveText('b');
  await expect(selected.locator('mark').last()).toHaveText('uniquehighlight');
  await selected.locator('mark').last().scrollIntoViewIfNeeded();
  await expect(selected.locator('mark').last()).toBeInViewport();
  return duration;
}
