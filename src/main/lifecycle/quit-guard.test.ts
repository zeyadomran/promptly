import { describe, expect, it, vi } from 'vitest';

import { createQuitGuard } from './quit-guard';

describe('quit cleanup guard', () => {
  it('prevents every quit while cleanup is pending and permits exit after completion', async () => {
    let finished: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finished = resolve;
    });
    const cleanup = vi.fn(() => pending);
    const quit = vi.fn();
    const failure = vi.fn();
    const preventDefault = vi.fn();
    const guard = createQuitGuard(cleanup, quit, failure);

    guard({ preventDefault });
    guard({ preventDefault });
    await Promise.resolve();
    guard({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(3);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(quit).not.toHaveBeenCalled();
    if (finished === undefined) throw new Error('Missing cleanup completion');
    finished();
    await vi.waitFor(() => {
      expect(quit).toHaveBeenCalledOnce();
    });
    guard({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(3);
    expect(quit).toHaveBeenCalledOnce();
    expect(failure).not.toHaveBeenCalled();
  });

  it('reports cleanup failure without falsely allowing a later quit', async () => {
    const quit = vi.fn();
    const failure = vi.fn();
    const preventDefault = vi.fn();
    const guard = createQuitGuard(
      () => Promise.reject(new Error('Owned fixture cleanup failed')),
      quit,
      failure
    );

    guard({ preventDefault });
    await vi.waitFor(() => {
      expect(failure).toHaveBeenCalledOnce();
    });
    guard({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(quit).not.toHaveBeenCalled();
  });
});
// @vitest-environment node
