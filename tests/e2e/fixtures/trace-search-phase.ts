/** No instrumentation in ordinary runs; only deterministic owned fixture data enters traces. */
export function traceSearchPhase(phase: string, detail: object = {}): void {
  if (document.documentElement.dataset['searchTrace'] !== '1') return;
  performance.mark(`promptly-search:${phase}`, {
    detail: {
      epochMs: performance.timeOrigin + performance.now(),
      focused: document.hasFocus(),
      visibility: document.visibilityState,
      ...detail
    }
  });
}
