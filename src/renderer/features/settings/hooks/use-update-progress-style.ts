import { useId, useLayoutEffect } from 'react';

/** Numeric progress is supplied through a nonce-authorized stylesheet for packaged CSP. */
export function useUpdateProgressStyle(percent?: number) {
  const scope = `update-${useId().replaceAll(/[^a-zA-Z0-9_-]/g, '')}`;
  const bounded =
    percent === undefined || !Number.isFinite(percent)
      ? undefined
      : Math.min(100, Math.max(0, percent));

  useLayoutEffect(() => {
    if (bounded === undefined) return;
    const style = document.createElement('style');

    if (window.promptlyStyleNonce !== undefined) style.nonce = window.promptlyStyleNonce;
    style.textContent = `.${scope}{--update-progress:${String(bounded)}%}`;
    document.head.append(style);
    return () => {
      style.remove();
    };
  }, [bounded, scope]);
  return scope;
}
