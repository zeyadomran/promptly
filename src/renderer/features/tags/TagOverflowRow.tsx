import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

/** Measures the rendered chips, including controls, before exposing a complete prefix. */
export function TagOverflowRow({
  items,
  leading,
  end,
  endWhenFits = false,
  trailing,
  overflow,
  className,
  label
}: {
  items: readonly { id: string; content: ReactNode }[];
  leading?: ReactNode;
  end: ReactNode;
  endWhenFits?: boolean;
  trailing?: ReactNode;
  overflow: (hidden: number, measuring?: boolean) => ReactNode;
  className: string;
  label: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);
  const count = Math.min(visible, items.length);
  const hidden = items.length - count;
  const samples = Array.from({ length: String(items.length).length }, (_, index) =>
    Math.min(items.length, 10 ** (index + 1) - 1)
  );

  useLayoutEffect(() => {
    const element = row.current;

    if (element === null) return;
    let active = true;
    const measure = () => {
      if (!active) return;
      const style = getComputedStyle(element);
      const available =
        element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const gap = parseFloat(style.columnGap) || 0;
      const width = (selector: string) =>
        element.querySelector<HTMLElement>(selector)?.getBoundingClientRect().width ?? 0;
      const fixed = ['[data-overflow-leading]', '[data-overflow-trailing]'].filter(
        (selector) => element.querySelector(selector) !== null
      );
      const trailingElement = element.querySelector<HTMLElement>('[data-overflow-trailing]');
      const trailingWidth = width('[data-overflow-trailing-measure]');
      const fixedWidth = fixed.reduce(
        (total, selector) =>
          total + (selector === '[data-overflow-trailing]' ? trailingWidth : width(selector)),
        0
      );
      const overflowWidth = (remaining: number) =>
        width('[data-overflow-size="' + String(String(remaining).length) + '"]');
      const chips = Array.from(element.querySelectorAll<HTMLElement>('[data-overflow-item]'));
      const widths = chips.map((chip) => chip.getBoundingClientRect().width);
      const endWidth = width('[data-overflow-end]');
      const allWidth =
        fixedWidth +
        endWidth +
        widths.reduce((total, value) => total + value, 0) +
        gap * Math.max(0, fixed.length + widths.length);

      if (allWidth <= available) {
        if (trailingElement !== null) trailingElement.style.maxWidth = '';
        setVisible(widths.length);
        return;
      }

      let used = fixedWidth + (endWhenFits ? 0 : endWidth);
      const controls = fixed.length + (endWhenFits ? 0 : 1);
      let fit = 0;

      for (let index = 0; index <= widths.length; index += 1) {
        const remaining = widths.length - index;

        if (remaining === 0) break;
        if (used + overflowWidth(remaining) + gap * (controls + index) <= available) fit = index;
        else break;
        used += widths[index] ?? 0;
      }

      if (trailingElement !== null) {
        // Badges yield first. Only oversized metadata shares the remaining space with its source label.
        const controlWidth =
          widths.length === 0
            ? endWidth
            : overflowWidth(widths.length - fit) + (endWhenFits ? 0 : endWidth);
        const controlCount = widths.length === 0 ? 1 : 1 + (endWhenFits ? 0 : 1);
        const metadataSpace =
          available -
          (fixedWidth - trailingWidth) -
          controlWidth -
          gap * (fixed.length + controlCount - 1);

        trailingElement.style.maxWidth = String(Math.max(0, metadataSpace)) + 'px';
      }

      setVisible(fit);
    };

    const observer = new ResizeObserver(measure);

    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    window.addEventListener('resize', measure);
    void document.fonts.ready.then(measure);
    measure();
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [items, leading, end, endWhenFits, trailing]);

  return (
    <div ref={row} className={className + ' tag-overflow-row'} role="group" aria-label={label}>
      {leading !== undefined && <span data-overflow-leading="">{leading}</span>}
      {items.map((item, index) => (
        <span
          key={item.id}
          data-overflow-item=""
          data-overflow-hidden={index >= count}
          inert={index >= count}
          aria-hidden={index >= count}
        >
          {item.content}
        </span>
      ))}
      <span data-overflow-hidden={hidden === 0} inert={hidden === 0} aria-hidden={hidden === 0}>
        {overflow(hidden)}
      </span>
      <span
        data-overflow-end=""
        data-overflow-hidden={endWhenFits && hidden > 0}
        inert={endWhenFits && hidden > 0}
        aria-hidden={endWhenFits && hidden > 0}
      >
        {end}
      </span>
      {trailing !== undefined && <span data-overflow-trailing="">{trailing}</span>}
      {trailing !== undefined && (
        <span
          data-overflow-trailing-measure=""
          data-overflow-hidden="true"
          inert
          aria-hidden="true"
        >
          {trailing}
        </span>
      )}
      {samples.map((sample, index) => (
        <span
          key={index}
          data-overflow-size={index + 1}
          data-overflow-hidden="true"
          inert
          aria-hidden="true"
        >
          {overflow(sample, true)}
        </span>
      ))}
    </div>
  );
}
