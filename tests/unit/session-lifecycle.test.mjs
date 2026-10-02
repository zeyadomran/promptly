// @vitest-environment node
import { EventEmitter } from 'node:events';

import { afterEach, expect, test, vi } from 'vitest';

import { sessionLifetime } from '../e2e/session-lifecycle';
import { retireSession } from '../e2e/session-retirement';

function child() {
  return Object.assign(new EventEmitter(), { pid: 42, kill: vi.fn(() => true) });
}

afterEach(() => vi.useRealTimers());

test('graceful stop observes exit and repeated close is idempotent', async () => {
  const process = child();
  const lifetime = sessionLifetime(process);
  const stop = vi.fn(async () => {
    process.emit('exit', 0, null);
  });
  const closing = lifetime.close(stop);

  expect(lifetime.close(stop)).toBe(closing);
  expect(await closing).toEqual({ observedExit: true, exitCode: 0, signal: null });
  expect(stop).toHaveBeenCalledTimes(1);
  expect(process.kill).not.toHaveBeenCalled();
});

test('hung stop request cannot prevent bounded owned-handle TERM and observed exit', async () => {
  vi.useFakeTimers();
  const process = child();
  const lifetime = sessionLifetime(process);

  process.kill.mockImplementation((signal) => {
    process.emit('exit', null, signal);
    return true;
  });
  const closing = lifetime.close(() => new Promise(() => {}));

  await vi.advanceTimersByTimeAsync(501);
  expect(await closing).toEqual({ observedExit: true, exitCode: null, signal: 'SIGTERM' });
  expect(process.kill.mock.calls).toEqual([['SIGTERM']]);
});

test('successful signals or close events never substitute for actual exit', async () => {
  vi.useFakeTimers();
  const process = child();
  const lifetime = sessionLifetime(process);

  process.emit('close', 0, null);
  const closing = lifetime.close(async () => {});
  const rejected = expect(closing).rejects.toThrow('exit was not observed');

  await vi.advanceTimersByTimeAsync(1501);
  await rejected;
  expect(process.kill.mock.calls).toEqual([['SIGTERM'], ['SIGKILL']]);
});

test('failed stop or TERM still attempts KILL and retains cleanup failure after actual exit', async () => {
  vi.useFakeTimers();
  const process = child();
  const lifetime = sessionLifetime(process);

  process.kill.mockImplementation((signal) => {
    if (signal === 'SIGTERM') throw new Error('owned TERM failure');
    process.emit('exit', null, signal);
    return true;
  });
  const closing = lifetime.close(async () => {
    throw new Error('owned stop failure');
  });
  const rejected = expect(closing).rejects.toThrow('Owned session cleanup failed');

  await vi.advanceTimersByTimeAsync(1001);
  await rejected;
  expect(lifetime.stopped()).toBe(true);
  expect(process.kill.mock.calls).toEqual([['SIGTERM'], ['SIGKILL']]);
});

test.each(['reject', 'deferred'])(
  'failed %s bootstrap/child evaluation still retires launcher',
  async (mode) => {
    vi.useFakeTimers();
    const events = [];
    const childCleanup = () =>
      mode === 'reject' ? Promise.reject(new Error('owned child failure')) : new Promise(() => {});
    const launcher = vi.fn(async () => ({ observedExit: true }));
    const closing = retireSession(childCleanup, launcher, (stage, status) =>
      events.push({ stage, status })
    );
    const rejected = expect(closing).rejects.toThrow('Owned session retirement failed');

    await vi.advanceTimersByTimeAsync(4001);
    await rejected;
    expect(launcher).toHaveBeenCalledOnce();
    expect(events).toEqual([
      { stage: 'child', status: 'failed' },
      { stage: 'launcher', status: 'verified' }
    ]);
  }
);

test('late bootstrap resolution within bound is awaited before observed retirement', async () => {
  vi.useFakeTimers();
  const events = [];
  const closing = retireSession(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve({ observedExit: true }), 100);
      }),
    async () => ({ observedExit: true }),
    (stage, status) => events.push({ stage, status })
  );

  await vi.advanceTimersByTimeAsync(101);
  expect(await closing).toEqual({
    child: { observedExit: true },
    launcher: { observedExit: true }
  });
  expect(events.every(({ status }) => status === 'verified')).toBe(true);
});

test('both child and launcher failures survive in order, with safe scalar outcomes', async () => {
  const first = new Error('owned child');
  const second = new Error('owned launcher');
  const events = [];
  const closing = retireSession(
    () => Promise.reject(first),
    () => Promise.reject(second),
    (stage, status) => events.push({ stage, status })
  );

  await expect(closing).rejects.toMatchObject({ errors: [first, second], cause: first });
  expect(events).toEqual([
    { stage: 'child', status: 'failed' },
    { stage: 'launcher', status: 'failed' }
  ]);
});
