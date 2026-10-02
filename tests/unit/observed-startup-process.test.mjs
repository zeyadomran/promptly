// @vitest-environment node
import { expect, it } from 'vitest';

import { observeStartupProcess } from '../observed-startup-process';

it('observes an immediate fatal exit and fixed markers without exposing private stderr', async () => {
  const receipt = await observeStartupProcess(
    process.execPath,
    [
      '-e',
      'process.stderr.write("Unable to initialize Promptly: Unable to open local storage. private data");process.exit(1)'
    ],
    process.env
  );

  expect(receipt).toMatchObject({
    status: 'exited',
    exitCode: 1,
    signals: ['initializationFailed', 'storageOpenFailed'],
    cleanup: { closed: true, pidGone: true, forcedTermination: false }
  });
  expect(receipt.stderrBytes).toBeGreaterThan(0);
  expect(JSON.stringify(receipt)).not.toContain('private data');
});

it('retains a missing executable failure and cannot qualify an arbitrary launch failure', async () => {
  const receipt = await observeStartupProcess(`${process.execPath}.missing`, [], process.env);

  expect(receipt).toMatchObject({
    status: 'spawnFailed',
    errorCode: 'ENOENT',
    pid: null,
    signals: [],
    cleanup: { closed: true, pidGone: true }
  });
});

it('bounds a silent live child, observes forced cleanup and never qualifies it as fatal startup', async () => {
  const receipt = await observeStartupProcess(
    process.execPath,
    ['-e', 'setInterval(()=>{},1000)'],
    process.env,
    100,
    1_000
  );

  expect(receipt).toMatchObject({
    status: 'timedOut',
    signals: [],
    deadlineMs: 100,
    cleanup: { closed: true, pidGone: true, forcedTermination: true }
  });
  expect(receipt.elapsedMs).toBeLessThan(2_500);
});
