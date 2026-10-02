// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { createQuitCoordinator } from './quit-coordinator';

function deferredCleanup() {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });

  return { promise, resolve, reject };
}

describe('application quit coordination', () => {
  it.each(['success', 'failure'] as const)(
    'blocks every repeated quit until cleanup %s settles',
    async (outcome) => {
      const deferred = deferredCleanup();
      const cleanup = vi.fn(() => deferred.promise);
      const quit = vi.fn();
      const onError = vi.fn();
      const beforeQuit = createQuitCoordinator({ cleanup, quit, onError });
      const attempts = Array.from({ length: 3 }, () => ({ preventDefault: vi.fn() }));

      for (const event of attempts) beforeQuit(event);
      expect(attempts.map((event) => event.preventDefault.mock.calls.length)).toEqual([1, 1, 1]);
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(quit).not.toHaveBeenCalled();
      const failure = new Error('Cleanup failed after terminating its worker.');

      if (outcome === 'success') deferred.resolve();
      else deferred.reject(failure);
      await Promise.resolve();
      expect(quit).toHaveBeenCalledTimes(1);
      if (outcome === 'failure') expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
      else expect(onError).not.toHaveBeenCalled();
      const finalEvent = { preventDefault: vi.fn() };

      beforeQuit(finalEvent);
      beforeQuit(finalEvent);
      expect(finalEvent.preventDefault).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(quit).toHaveBeenCalledTimes(1);
    }
  );

  it('allows the final reentrant quit event only after deferred cleanup settles', async () => {
    const deferred = deferredCleanup();
    const cleanup = vi.fn(() => deferred.promise);
    const initial = { preventDefault: vi.fn() };
    const finalEvent = { preventDefault: vi.fn() };
    const beforeQuit = createQuitCoordinator({
      cleanup,
      onError: vi.fn(),
      quit: () => {
        beforeQuit(finalEvent);
      }
    });

    beforeQuit(initial);
    beforeQuit(finalEvent);
    expect(finalEvent.preventDefault).toHaveBeenCalledTimes(1);
    finalEvent.preventDefault.mockClear();
    deferred.resolve();
    await Promise.resolve();
    expect(finalEvent.preventDefault).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('settles synchronous cleanup failures through the same final-quit path', () => {
    const error = new Error('Cleanup could not start.');
    const cleanup = vi.fn(() => {
      throw error;
    });
    const quit = vi.fn();
    const onError = vi.fn();
    const beforeQuit = createQuitCoordinator({ cleanup, quit, onError });
    const initial = { preventDefault: vi.fn() };

    beforeQuit(initial);
    expect(initial.preventDefault).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(quit).toHaveBeenCalledTimes(1);
    const finalEvent = { preventDefault: vi.fn() };

    beforeQuit(finalEvent);
    expect(finalEvent.preventDefault).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
