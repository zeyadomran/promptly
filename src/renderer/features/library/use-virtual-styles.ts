import { useId, useLayoutEffect, useRef } from 'react';

/** CSP-authorized CSS supplies numeric virtual positions without inline style attributes. */
export function useVirtualStyles(
  height: number,
  rows: readonly { index: number; start: number }[]
) {
  const scope = `virtual-${useId().replaceAll(/[^a-zA-Z0-9_-]/g, '')}`;
  const sheet = useRef<HTMLStyleElement | null>(null);
  const rules =
    `.${scope}{height:${String(height)}px}` +
    rows
      .map(
        (row) =>
          `.${scope} > .virtual-row-${String(row.index)}{transform:translateY(${String(row.start)}px)}`
      )
      .join('');

  useLayoutEffect(() => {
    const style = document.createElement('style');

    if (window.promptlyStyleNonce !== undefined) style.nonce = window.promptlyStyleNonce;
    style.dataset.libraryVirtualStyle = scope;
    document.head.append(style);
    sheet.current = style;
    return () => {
      sheet.current = null;
      style.remove();
    };
  }, [scope]);
  useLayoutEffect(() => {
    if (sheet.current !== null) sheet.current.textContent = rules;
  }, [rules]);
  return scope;
}
