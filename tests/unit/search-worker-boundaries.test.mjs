// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, expect, test, vi } from 'vitest';

import { finishSearchWorkerBoundaries } from '../e2e/search-worker-boundaries';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

test('ordinary runs never invoke the diagnostic flush', async () => {
  vi.stubEnv('PROMPTLY_SEARCH_TRACE', '0');
  const application = { evaluate: vi.fn() };

  expect(await finishSearchWorkerBoundaries(application, {}, true)).toBeUndefined();
  expect(application.evaluate).not.toHaveBeenCalled();
});

test.each([true, false])(
  'complete or aborted workloads retain separate nonqualifying receipts',
  async (completed) => {
    vi.stubEnv('PROMPTLY_SEARCH_TRACE', '1');
    const directory = await mkdtemp(path.join(os.tmpdir(), 'promptly-boundaries-'));
    const filename = path.join(directory, 'search-worker-boundaries.json');
    const receipt = { events: [], incompleteRequests: 1, droppedRequests: 0 };
    const application = { evaluate: vi.fn().mockResolvedValue(receipt) };
    const info = { outputPath: () => filename, attach: vi.fn().mockResolvedValue(undefined) };

    try {
      expect(await finishSearchWorkerBoundaries(application, info, completed)).toEqual(receipt);
      expect(JSON.parse(await readFile(filename, 'utf8'))).toEqual({
        workloadCompleted: completed,
        qualification: false,
        receipt
      });
      expect(info.attach).toHaveBeenCalledOnce();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
);

test('a stalled diagnostic flush has a bounded failure for settled cleanup', async () => {
  vi.stubEnv('PROMPTLY_SEARCH_TRACE', '1');
  vi.useFakeTimers();
  const application = { evaluate: () => new Promise(() => {}) };
  const assertion = expect(finishSearchWorkerBoundaries(application, {}, false)).rejects.toThrow(
    'timed out'
  );

  await vi.advanceTimersByTimeAsync(5000);
  await assertion;
});
