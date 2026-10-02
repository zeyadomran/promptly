import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { readHighlightCoverage } from './highlight-coverage';
import { searchCorpusText } from './search-corpus';

export async function assertVisibleSearch(page: Page, query: string) {
  await expect(page.locator('.fixture-list')).toBeInViewport({ ratio: 1 });
  const selected = page.getByRole('complementary', { name: 'Selected full text' });

  if (query === 'no-match-zzzz') {
    await expect(selected).toHaveCount(0);
    return;
  }

  await expect(selected).toBeInViewport({ ratio: 1 });
  await expect(selected.locator('pre')).toHaveText(
    searchCorpusText(query === 'needle-9999' ? 9999 : 0)
  );
  if (query !== '') {
    const coverage = await readHighlightCoverage(selected);

    expect(coverage.length).toBeGreaterThan(0);
    expect(coverage[0]?.visible).toBe(true);
    expect(coverage[0]?.background).toBe('rgb(67, 53, 13)');
  }

  const geometry = await selected.evaluate((element) => {
    const body = element.querySelector('pre');
    const bounds = element.getBoundingClientRect();

    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      font: body === null ? '' : getComputedStyle(body).fontFamily,
      whiteSpace: body === null ? '' : getComputedStyle(body).whiteSpace,
      textHeight: body?.getBoundingClientRect().height ?? 0,
      lineHeight: body === null ? 0 : Number.parseFloat(getComputedStyle(body).lineHeight),
      focused: document.hasFocus(),
      visibility: document.visibilityState
    };
  });

  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.font).toContain('Geist Mono');
  expect(geometry.whiteSpace).toBe('pre-wrap');
  expect(geometry.textHeight).toBeGreaterThan(geometry.lineHeight);
  expect(geometry.focused).toBe(true);
  expect(geometry.visibility).toBe('visible');
  return geometry;
}
