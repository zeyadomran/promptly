# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> 10k input-to-painted React results via named IPC and the packaged worker
- Location: tests\e2e\search.spec.ts:14:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test';
  2  | import { expect } from '@playwright/test';
  3  | 
  4  | import { readHighlightCoverage } from './highlight-coverage';
  5  | import { searchCorpusText } from './search-corpus';
  6  | 
  7  | export async function assertVisibleSearch(page: Page, query: string) {
  8  |   await expect(page.locator('.fixture-list')).toBeInViewport({ ratio: 1 });
  9  |   const selected = page.getByRole('complementary', { name: 'Selected full text' });
  10 | 
  11 |   if (query === 'no-match-zzzz') {
  12 |     await expect(selected).toHaveCount(0);
  13 |     return;
  14 |   }
  15 | 
  16 |   await expect(selected).toBeInViewport({ ratio: 1 });
  17 |   await expect(selected.locator('pre')).toHaveText(
  18 |     searchCorpusText(query === 'needle-9999' ? 9999 : 0)
  19 |   );
  20 |   if (query !== '') {
  21 |     const coverage = await readHighlightCoverage(selected);
  22 | 
  23 |     expect(coverage.length).toBeGreaterThan(0);
> 24 |     expect(coverage[0]?.visible).toBe(true);
     |                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  25 |     expect(coverage[0]?.background).toBe('rgb(67, 53, 13)');
  26 |   }
  27 | 
  28 |   const geometry = await selected.evaluate((element) => {
  29 |     const body = element.querySelector('pre');
  30 |     const bounds = element.getBoundingClientRect();
  31 | 
  32 |     return {
  33 |       left: bounds.left,
  34 |       right: bounds.right,
  35 |       top: bounds.top,
  36 |       bottom: bounds.bottom,
  37 |       viewportWidth: innerWidth,
  38 |       viewportHeight: innerHeight,
  39 |       font: body === null ? '' : getComputedStyle(body).fontFamily,
  40 |       whiteSpace: body === null ? '' : getComputedStyle(body).whiteSpace,
  41 |       textHeight: body?.getBoundingClientRect().height ?? 0,
  42 |       lineHeight: body === null ? 0 : Number.parseFloat(getComputedStyle(body).lineHeight),
  43 |       focused: document.hasFocus(),
  44 |       visibility: document.visibilityState
  45 |     };
  46 |   });
  47 | 
  48 |   expect(geometry.left).toBeGreaterThanOrEqual(0);
  49 |   expect(geometry.top).toBeGreaterThanOrEqual(0);
  50 |   expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  51 |   expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  52 |   expect(geometry.font).toContain('Geist Mono');
  53 |   expect(geometry.whiteSpace).toBe('pre-wrap');
  54 |   expect(geometry.textHeight).toBeGreaterThan(geometry.lineHeight);
  55 |   expect(geometry.focused).toBe(true);
  56 |   expect(geometry.visibility).toBe('visible');
  57 |   return geometry;
  58 | }
  59 | 
```