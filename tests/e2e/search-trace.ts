import type { ElectronApplication, Page, TestInfo } from '@playwright/test';

/** Passive phase/long-task/frame observations; no query warming or readiness delay. */
export async function prepareSearchTrace(page: Page): Promise<void> {
  if (process.env['PROMPTLY_SEARCH_TRACE'] !== '1') return;
  await page.evaluate(() => {
    document.documentElement.dataset['searchTrace'] = '1';
    const record = (phase: string, detail: object = {}) => {
      performance.mark(`promptly-search:${phase}`, {
        detail: {
          epochMs: performance.timeOrigin + performance.now(),
          focused: document.hasFocus(),
          visibility: document.visibilityState,
          ...detail
        }
      });
    };

    record('observer-attached', { readyState: document.readyState });
    for (const event of ['focus', 'blur', 'pageshow'])
      window.addEventListener(event, () => {
        record(event);
      });
    document.addEventListener('visibilitychange', () => {
      record('visibilitychange');
    });
    void document.fonts.ready.then(() => {
      record('fonts-ready');
    });
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        record('long-task', { start: entry.startTime, duration: entry.duration });
    });

    observer.observe({ type: 'longtask', buffered: true });
    let previous = performance.now();
    const until = previous + 9000;
    const frame = (timestamp: number) => {
      record('frame-cadence', { timestamp, gap: timestamp - previous });
      previous = timestamp;
      if (performance.now() < until) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  });
}

export async function finishSearchTrace(application: ElectronApplication, testInfo: TestInfo) {
  if (process.env['PROMPTLY_SEARCH_TRACE'] !== '1') return;
  const filename = testInfo.outputPath('search-chromium-trace.json');

  const recorded = await application.evaluate(({ app }) => {
    if (app.listenerCount('search-fixture:stop-trace') === 0) return undefined;
    return new Promise<string>((resolve, reject) => {
      app.emit('search-fixture:stop-trace', resolve, reject);
    });
  });

  if (recorded === undefined) return;
  await testInfo.attach('search-chromium-trace', {
    path: filename,
    contentType: 'application/json'
  });
}

/** Always release both resources even when diagnostic flushing or application close rejects. */
export async function settleSearchCleanup(
  operations: readonly (() => Promise<void>)[],
  alreadyFailed = false
) {
  const errors: unknown[] = [];

  for (const operation of operations) {
    try {
      await operation();
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length === 0) return;
  const failure = new AggregateError(errors, 'Search fixture cleanup failed.');

  if (alreadyFailed) console.error('Search fixture cleanup also failed:', failure);
  else throw failure;
}
