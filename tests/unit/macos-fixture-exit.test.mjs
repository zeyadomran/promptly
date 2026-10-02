// @vitest-environment node
import { EventEmitter } from 'node:events';

import { afterEach, expect, test, vi } from 'vitest';

import { ownedFixtureExit } from '../e2e/macos-fixture-exit';

function child() {
  return Object.assign(new EventEmitter(), { pid: 42, kill: vi.fn(() => true) });
}

afterEach(() => {
  vi.useRealTimers();
});

test('a stop request must produce an observed exit before cleanup resolves', async () => {
  const process = child();
  const lifetime = ownedFixtureExit(process);
  const stop = vi.fn(async () => {
    process.emit('exit', 0, null);
  });
  const closing = lifetime.close(stop);

  expect(lifetime.close(stop)).toBe(closing);
  expect(await closing).toEqual({ observedExit: true, exitCode: 0, signal: null });
  expect(lifetime.hasExited()).toBe(true);
  expect(stop).toHaveBeenCalledTimes(1);
  expect(process.kill).not.toHaveBeenCalled();
});

test('the old timeout/no-exit reproduction now rejects even when signals return success', async () => {
  vi.useFakeTimers();
  const process = child();
  const lifetime = ownedFixtureExit(process);
  const closing = lifetime.close(async () => {});
  const rejected = expect(closing).rejects.toThrow('exit was not observed');

  await vi.advanceTimersByTimeAsync(6001);
  await rejected;
  expect(lifetime.hasExited()).toBe(false);
  expect(process.kill.mock.calls).toEqual([['SIGTERM'], ['SIGKILL']]);
});

test('TERM completion waits for its actual exit event and avoids KILL', async () => {
  vi.useFakeTimers();
  const process = child();
  const lifetime = ownedFixtureExit(process);

  process.kill.mockImplementation((signal) => {
    setTimeout(() => {
      process.emit('exit', null, signal);
    }, 100);
    return true;
  });
  const closing = lifetime.close(async () => {});

  await vi.advanceTimersByTimeAsync(5101);
  expect(await closing).toEqual({ observedExit: true, exitCode: null, signal: 'SIGTERM' });
  expect(process.kill.mock.calls).toEqual([['SIGTERM']]);
});

test('KILL completion is awaited rather than merely sent', async () => {
  vi.useFakeTimers();
  const process = child();
  const lifetime = ownedFixtureExit(process);

  process.kill.mockImplementation((signal) => {
    if (signal === 'SIGKILL')
      setTimeout(() => {
        process.emit('exit', null, signal);
      }, 100);
    return true;
  });
  const closing = lifetime.close(async () => {});

  await vi.advanceTimersByTimeAsync(5601);
  expect(await closing).toEqual({ observedExit: true, exitCode: null, signal: 'SIGKILL' });
});

test('close or spawn error cannot substitute for the direct source exit event', async () => {
  vi.useFakeTimers();
  const process = child();
  const lifetime = ownedFixtureExit(process);

  process.emit('close', 0, null);
  process.emit('error', new Error('owned fake spawn error'));
  const closing = lifetime.close(async () => {});
  const rejected = expect(closing).rejects.toThrow('exit was not observed');

  await vi.advanceTimersByTimeAsync(1001);
  await rejected;
  expect(lifetime.hasExited()).toBe(false);
});

test('failed native ownership validation still retires the owned launcher handle', async () => {
  vi.useFakeTimers();
  const process = child();
  const lifetime = ownedFixtureExit(process);

  process.kill.mockImplementation((signal) => {
    process.emit('exit', null, signal);
    return true;
  });
  const closing = lifetime.close(
    async () => {},
    async () => {
      throw new Error('native identity changed');
    }
  );
  const rejected = expect(closing).rejects.toThrow('Owned fixture cleanup failed');

  await vi.advanceTimersByTimeAsync(5001);
  await rejected;
  expect(process.kill.mock.calls).toEqual([['SIGTERM']]);
  expect(lifetime.hasExited()).toBe(true);
});
