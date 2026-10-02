// @vitest-environment node
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { startFixture } from '../../experiments/native-capture/fixture-process.mjs';

const executable = fileURLToPath(new URL('./fixture-process-subprocess.mjs', import.meta.url));
const launch = (mode) => startFixture(process.execPath, mode, [executable, mode]);

test('early exit preserves code42 and safe byte counts instead of a five-second timeout', async () => {
  const started = performance.now();
  const error = await launch('exit').catch((failure) => failure);

  expect(['exited', 'outputClosed']).toContain(error.receipt.status);
  expect(error.receipt).toMatchObject({
    mode: 'exit',
    stage: 'readiness',
    exitCode: 42,
    stderrBytes: Buffer.byteLength('owned private fixture output')
  });
  expect(error.cleanup.status).toBe('closed');
  expect(JSON.stringify(error.receipt)).not.toContain('private');
  expect(error.message).not.toContain('private');
  expect(performance.now() - started).toBeLessThan(2000);
});

test('a missing executable rejects ENOENT without an uncaught child error', async () => {
  const error = await startFixture(`${executable}.missing`, 'selected', []).catch(
    (failure) => failure
  );

  expect(error.receipt).toMatchObject({ status: 'spawnFailed', errorCode: 'ENOENT', pid: null });
  expect(error.cleanup.status).toBe('closed');
});

test.each(['malformed', 'wrongPid', 'oversized'])(
  '%s readiness fails and observes cleanup',
  async (mode) => {
    const error = await launch(mode).catch((failure) => failure);

    expect(error.receipt.status).toBe(
      mode === 'oversized' ? 'metadataTooLarge' : 'invalidMetadata'
    );
    expect(error.cleanup.status).toBe('closed');
    expect(error.receipt.pid).toBeGreaterThan(0);
    expect(() => process.kill(error.receipt.pid, 0)).toThrow();
  }
);

test('a live silent fixture uses the unchanged five-second readiness deadline', async () => {
  const started = performance.now();
  const error = await launch('silent').catch((failure) => failure);

  expect(error.receipt.status).toBe('timedOut');
  expect(error.receipt.startupStages.map((observation) => observation.stage)).toEqual([
    'mainEntered',
    'uiInitialized'
  ]);
  expect(error.receipt.elapsedMs).toBeGreaterThanOrEqual(4990);
  expect(error.cleanup.status).toBe('closed');
  expect(performance.now() - started).toBeLessThan(6500);
}, 8000);

test('close is idempotent and resolves only after the owned PID is gone', async () => {
  const fixture = await launch('delayedClose');
  const first = fixture.close();

  expect(fixture.close()).toBe(first);
  expect((await first).status).toBe('closed');
  expect(fixture.startupReceipt.stage).toBe('ready');
  expect(fixture.receipt().stage).toBe('closed');
  expect(() => process.kill(fixture.fixturePid, 0)).toThrow();
});

test('an owned fixture resisting graceful termination is killed within the cleanup bound', async () => {
  const fixture = await launch('resist');
  const started = performance.now();

  const cleanup = await fixture.close();

  expect(cleanup.status).toBe('closed');
  if (process.platform !== 'win32') expect(cleanup.signal).toBe('SIGKILL');
  expect(performance.now() - started).toBeLessThan(1500);
  expect(() => process.kill(fixture.fixturePid, 0)).toThrow();
});
