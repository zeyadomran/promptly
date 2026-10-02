import { writeFile } from 'node:fs/promises';

import type { Page, TestInfo } from '@playwright/test';

/** Opt-in diagnosis only; profiled samples never qualify the performance gate. */
export async function startSearchProfiler(page: Page, testInfo: TestInfo) {
  if (process.env['PROMPTLY_SEARCH_PROFILE'] !== '1') return () => Promise.resolve(undefined);
  const session = await page.context().newCDPSession(page);

  await session.send('Profiler.enable');
  await session.send('Profiler.start');
  return async () => {
    const result: unknown = await session.send('Profiler.stop');
    const filename = testInfo.outputPath('search-renderer.cpuprofile');

    await writeFile(filename, JSON.stringify(result));
    await testInfo.attach('search-renderer-profile', {
      path: filename,
      contentType: 'application/json'
    });
    await session.detach();
  };
}
