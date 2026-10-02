import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { readHighlightCoverage } from './highlight-coverage';
import { pngPixels } from './png-pixels';

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
  const coverage = await readHighlightCoverage(selected);

  expect(coverage).toHaveLength(703);
  expect(coverage[0]?.text).toBe('b');
  expect(coverage[701]?.text).toBe('b');
  expect(coverage[702]?.text).toBe('uniquehighlight');
  for (const range of coverage) {
    expect(range.width).toBeGreaterThan(0);
    expect(range.height).toBeGreaterThan(0);
    expect(range.background).toBe('rgb(67, 53, 13)');
  }

  expect(coverage[0]?.visible).toBe(true);
  expect(coverage[702]?.visible).toBe(true);
  const pixels = pngPixels(await page.screenshot({ scale: 'css' }));

  for (const range of coverage) {
    let painted = 0;

    for (let y = Math.ceil(range.y); y < Math.floor(range.y + range.height); y += 1)
      for (let x = Math.ceil(range.x); x < Math.floor(range.x + range.width); x += 1)
        if (pixels.at(x, y).join(',') === '67,53,13') painted += 1;
    expect(painted, `painted background at UTF-16 range ${String(range.start)}`).toBeGreaterThan(1);
  }

  const selectedText = await selected.locator('pre').evaluate((element) => {
    const range = document.createRange();

    range.selectNodeContents(element);
    const selection = window.getSelection();

    selection?.removeAllRanges();
    selection?.addRange(range);
    const copiedText = selection?.toString();

    selection?.removeAllRanges();
    return copiedText;
  });

  expect(selectedText).toBe(text);

  return duration;
}
