import type { Locator } from '@playwright/test';

/** Inspect the browser's actual styled ranges and layout, rather than a DOM node count. */
export async function readHighlightCoverage(element: Locator) {
  return element.evaluate((root) => {
    const ranges = CSS.highlights.get('promptly-search-text');
    const owned = Array.from(ranges ?? []).filter((range) => root.contains(range.startContainer));

    return owned.map((range) => {
      const measured = document.createRange();

      measured.setStart(range.startContainer, range.startOffset);
      measured.setEnd(range.endContainer, range.endOffset);
      const rect = measured.getClientRects()[0];
      const parent = range.startContainer.parentElement;

      return {
        start: range.startOffset,
        end: range.endOffset,
        text: measured.toString(),
        background:
          parent === null
            ? ''
            : getComputedStyle(parent, '::highlight(promptly-search-text)').backgroundColor,
        x: rect?.left ?? -1,
        y: rect?.top ?? -1,
        width: rect?.width ?? 0,
        height: rect?.height ?? 0,
        visible:
          rect !== undefined &&
          rect.top >= 0 &&
          rect.bottom <= innerHeight &&
          rect.left >= 0 &&
          rect.right <= innerWidth
      };
    });
  });
}
