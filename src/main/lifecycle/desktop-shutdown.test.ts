// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';

import { closeDesktopServices } from './close-desktop-services';
import { createDesktopShutdown } from './desktop-shutdown';

afterEach(() => {
  vi.useRealTimers();
});

it.each(['storage initialization', 'window creation'])(
  'waits for native cleanup after fatal %s failure',
  async () => {
    let finish: (() => void) | undefined;
    const native = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const storage = vi.fn(() => Promise.reject(new Error('Owned storage failure')));
    const exit = vi.fn();
    const quit = vi.fn();
    const onError = vi.fn();
    const shutdown = createDesktopShutdown({
      cleanup: () => closeDesktopServices([storage, native]),
      exit,
      quit,
      onError
    });
    const preventDefault = vi.fn();

    shutdown.fatal();
    shutdown.fatal();
    shutdown.beforeQuit({ preventDefault });
    await vi.waitFor(() => {
      expect(native).toHaveBeenCalledOnce();
    });
    expect(storage).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();
    expect(quit).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    if (finish === undefined) throw new Error('Missing native completion');
    finish();
    await vi.waitFor(() => {
      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    });
    expect(onError).toHaveBeenCalledOnce();
    shutdown.fatal();
    expect(exit).toHaveBeenCalledOnce();
  }
);

it('bounds never-settling cleanup and ignores late completion after fatal exit', async () => {
  vi.useFakeTimers();
  let finish: (() => void) | undefined;
  const cleanup = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  const exit = vi.fn();
  const onError = vi.fn();
  const shutdown = createDesktopShutdown({
    cleanup,
    exit,
    quit: vi.fn(),
    onError,
    deadlineMs: 100
  });

  shutdown.fatal();
  await vi.advanceTimersByTimeAsync(99);
  expect(exit).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  expect(onError).toHaveBeenCalledWith(new Error('Desktop cleanup timed out.'));
  if (finish === undefined) throw new Error('Missing pending cleanup');
  finish();
  await vi.runAllTimersAsync();
  expect(exit).toHaveBeenCalledOnce();
  expect(cleanup).toHaveBeenCalledOnce();
});

it('promotes an already pending ordinary quit to fatal without starting cleanup twice', async () => {
  let finish: (() => void) | undefined;
  const cleanup = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  const exit = vi.fn();
  const quit = vi.fn();
  const shutdown = createDesktopShutdown({ cleanup, exit, quit, onError: vi.fn() });

  shutdown.beforeQuit({ preventDefault: vi.fn() });
  await vi.waitFor(() => {
    expect(cleanup).toHaveBeenCalledOnce();
  });
  shutdown.fatal();
  if (finish === undefined) throw new Error('Missing pending cleanup');
  finish();
  await vi.waitFor(() => {
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
  expect(quit).not.toHaveBeenCalled();
  expect(cleanup).toHaveBeenCalledOnce();
});
