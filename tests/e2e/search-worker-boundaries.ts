import { writeFile } from 'node:fs/promises';

import type { ElectronApplication, TestInfo } from '@playwright/test';

/** Called after measured work finishes or aborts, never between measured query samples. */
export async function finishSearchWorkerBoundaries(
  application: ElectronApplication,
  testInfo: TestInfo,
  workloadCompleted: boolean
) {
  if (process.env['PROMPTLY_SEARCH_TRACE'] !== '1') return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const capture = application.evaluate(({ app }) => {
    if (app.listenerCount('search-fixture:flush-worker-boundaries') === 0) return undefined;
    return new Promise<unknown>((resolve) => {
      app.emit('search-fixture:flush-worker-boundaries', resolve);
    });
  });
  const receipt = await Promise.race([
    capture,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('Owned search worker diagnostic flush timed out.'));
      }, 5000);
    })
  ]).finally(() => {
    clearTimeout(timer);
  });

  if (receipt === undefined) return undefined;
  const filename = testInfo.outputPath('search-worker-boundaries.json');

  await writeFile(
    filename,
    JSON.stringify({ workloadCompleted, qualification: false, receipt }, null, 2)
  );
  await testInfo.attach('search-worker-boundaries', {
    path: filename,
    contentType: 'application/json'
  });
  return receipt;
}
