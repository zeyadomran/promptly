import { useLayoutEffect, useRef, useState } from 'react';

import type { SnippetPreview } from '../../../shared/contracts/domain';

/** Fit an ordered prefix of complete names while reserving the exact remaining count. */
export function useRowTagOverflow(tags: SnippetPreview['tags']) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);

  useLayoutEffect(() => {
    const element = container.current;

    if (element === null) return;
    let active = true;
    const measure = () => {
      if (!active) return;
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      const widths = Array.from(element.querySelectorAll<HTMLElement>('[data-row-tag]')).map(
        (tag) => tag.getBoundingClientRect().width
      );
      const overflowWidth = (remaining: number) =>
        element
          .querySelector<HTMLElement>('[data-row-overflow="' + String(remaining) + '"]')
          ?.getBoundingClientRect().width ?? 0;
      let used = 0;
      let fit = 0;

      for (let count = 0; count <= widths.length; count += 1) {
        const remaining = widths.length - count;
        const total = used + (remaining > 0 ? overflowWidth(remaining) + (count > 0 ? gap : 0) : 0);

        if (total <= element.clientWidth) fit = count;
        used += (widths[count] ?? 0) + (count > 0 ? gap : 0);
      }

      setVisible(fit);
    };

    const observer = new ResizeObserver(measure);

    observer.observe(element);
    void document.fonts.ready.then(measure);
    measure();
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [tags]);

  return { container, visible: Math.min(visible, tags.length) };
}
