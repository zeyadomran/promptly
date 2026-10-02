import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron, type TestInfo } from '@playwright/test';

import { assertProfileIdentity } from '../profile-identity';
import { buildIpcFixture } from './build-ipc-fixture';
import { seedSearchCorpus } from './search-corpus';
import { finishSearchTrace, settleSearchCleanup } from './search-trace';

/** Every fixture owns its corpus and profile; no mode can open the default userData. */
export async function launchSearchFixture(testInfo: TestInfo) {
  await buildIpcFixture(undefined, 'tests/e2e/fixtures/search-main.ts', 'search');
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-search-'));
  const filename = path.join(directory, 'search.sqlite');
  let corpus: ReturnType<typeof seedSearchCorpus>;

  try {
    corpus = seedSearchCorpus(filename);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }

  const packaged = path.resolve('out', `Promptly-${process.platform}-${process.arch}`);
  const asar =
    process.platform === 'darwin'
      ? path.join(packaged, 'Promptly.app/Contents/Resources/app.asar')
      : path.join(packaged, 'resources/app.asar');
  const env: Record<string, string> = {
    PROMPTLY_SEARCH_DATABASE: filename,
    PROMPTLY_SEARCH_TRACE_PATH: testInfo.outputPath('search-chromium-trace.json'),
    PROMPTLY_SEARCH_WORKER: path.join(asar, '.vite/build/storage-worker.cjs')
  };

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }

  delete env.ELECTRON_RUN_AS_NODE;
  const traceProfile = path.join(directory, 'trace-profile');
  const application = await electron
    .launch({
      args: [path.resolve('.vite/build/ipc-fixture.cjs'), `--user-data-dir=${traceProfile}`],
      env
    })
    .catch(async (error: unknown) => {
      await rm(directory, { recursive: true, force: true });
      throw error;
    });
  const consoleMessages: string[] = [];

  application.process().stdout?.on('data', (data: Buffer) => {
    consoleMessages.push(data.toString());
  });
  try {
    const actual = await application.evaluate(({ app }) => app.getPath('userData'));
    const profileIdentity = await assertProfileIdentity(actual, traceProfile);

    return { application, consoleMessages, corpus, directory, profileIdentity };
  } catch (error) {
    await settleSearchCleanup(
      [
        () => finishSearchTrace(application, testInfo),
        () => application.close(),
        () => rm(directory, { recursive: true, force: true })
      ],
      true
    );
    throw error;
  }
}
