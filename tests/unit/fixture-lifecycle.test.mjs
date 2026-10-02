// @vitest-environment node
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { expect, test, vi } from 'vitest';

import { fixtureLifecycle } from '../../experiments/native-capture/fixture-lifecycle.mjs';
import { startPipeFixture } from '../../experiments/native-capture/fixture-pipe.mjs';

function ownedChild() {
  const child = Object.assign(new EventEmitter(), {
    pid: 123,
    exitCode: null,
    signalCode: null,
    stdout: new PassThrough(),
    stderr: new PassThrough()
  });

  child.kill = vi.fn((signal) => {
    child.signalCode = signal;
    child.emit('exit', null, signal);
    child.emit('close', null, signal);
    return true;
  });
  return child;
}

test('stream failure settles once and late metadata/error/exit events cannot reject again', async () => {
  const child = ownedChild();
  const lifecycle = fixtureLifecycle(child, 'selected');

  child.stdout.emit('error', Object.assign(new Error('private text'), { code: 'EIO' }));
  lifecycle.accept({ fixturePid: 123 });
  const error = await lifecycle.readiness.catch((failure) => failure);

  expect(error.receipt).toMatchObject({ status: 'streamFailed', errorCode: 'EIO' });
  expect(error.message).not.toContain('private');
  await lifecycle.close();
  child.emit('error', new Error('late private error'));
  child.stderr.emit('error', new Error('late stream error'));
  child.emit('exit', 42);
  expect(child.stdout.listenerCount('data')).toBe(0);
  expect(child.stderr.listenerCount('data')).toBe(0);
  expect(child.listenerCount('exit')).toBe(0);
});

test('cleanup timeout is bounded and never claims the child terminated', async () => {
  vi.useFakeTimers();
  const child = ownedChild();

  child.kill = vi.fn(() => false);
  const lifecycle = fixtureLifecycle(child, 'selected');

  lifecycle.accept({ fixturePid: 123 });
  await lifecycle.readiness;
  const result = lifecycle.close().catch((error) => error);

  await vi.advanceTimersByTimeAsync(1100);
  expect((await result).receipt.status).toBe('cleanupTimedOut');
  expect(child.kill.mock.calls).toEqual([['SIGTERM'], ['SIGKILL']]);
  vi.useRealTimers();
});

test('a closed readiness pipe rejects immediately and observes owned termination', async () => {
  const child = ownedChild();
  const readiness = startPipeFixture(child, 'selected');

  child.stdout.emit('end');
  const error = await readiness.catch((failure) => failure);

  expect(error.receipt.status).toBe('outputClosed');
  expect(error.cleanup.status).toBe('closed');
  expect(child.stdout.listenerCount('end')).toBe(0);
});
