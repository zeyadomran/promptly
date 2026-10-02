import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { readHighlightCoverage } from './highlight-coverage';
import { pngPixels } from './png-pixels';

/** Exercise the production stylesheet under the current CSP and active theme. */
export async function assertHighlightPaint(page: Page, text: Locator): Promise<string> {
  const coverage = await readHighlightCoverage(text);
  const color = await text.evaluate((element) => {
    const span = element.querySelector('span');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (span === null || context === null) throw new Error('Missing highlighted text');
    const background = getComputedStyle(span, '::highlight(promptly-search-text)').backgroundColor;

    context.fillStyle = background;
    context.fillRect(0, 0, 1, 1);
    return { background, rgb: Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3) };
  });
  const pixels = pngPixels(await page.screenshot({ scale: 'css' }));
  let painted = 0;

  for (const range of coverage.filter((candidate) => candidate.visible))
    for (let y = Math.ceil(range.y); y < Math.floor(range.y + range.height); y += 1)
      for (let x = Math.ceil(range.x); x < Math.floor(range.x + range.width); x += 1)
        if (pixels.at(x, y).join(',') === color.rgb.join(',')) painted += 1;
  expect(painted).toBeGreaterThan(1);
  return color.background;
}
