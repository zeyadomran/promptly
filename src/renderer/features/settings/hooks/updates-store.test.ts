import { expect, it, vi } from 'vitest';

import type { DesktopResult } from '../../../../shared/contracts/result';
import type { UpdateState } from '../../../../shared/contracts/updates';
import { actOnUpdate, getUpdateSnapshot, subscribeUpdates } from './updates-store';

it('shares the update stream, rejects stale reads and dispatches the failed operation on retry', async () => {
  let emit: (state: UpdateState) => void = () => undefined;
  let resolveRead: (result: DesktopResult<UpdateState>) => void = () => undefined;
  const streams = new Set<(state: UpdateState) => void>();
  const actions: string[] = [];
  const observed: string[] = [];
  const available: UpdateState = {
    revision: 2,
    status: 'available',
    version: '0.2.0',
    message: 'Available',
    focusRequest: 0
  };

  vi.stubGlobal('window', {
    promptly: {
      subscribeUpdates: (listener: (state: UpdateState) => void) => {
        emit = listener;
        streams.add(listener);
        return () => {
          streams.delete(listener);
        };
      },
      getUpdateState: () =>
        new Promise<DesktopResult<UpdateState>>((resolve) => {
          resolveRead = resolve;
        }),
      checkForUpdates: () => {
        actions.push('check');
        return Promise.resolve({
          ok: true,
          value: { ...available, revision: 4, status: 'current' }
        });
      },
      installUpdate: () => {
        actions.push('install');
        return Promise.resolve({
          ok: true,
          value: { ...available, revision: 6, status: 'updating' }
        });
      },
      restartForUpdate: () => {
        actions.push('restart');
        return Promise.resolve({ ok: true, value: {} });
      }
    }
  });
  const stopTitle = subscribeUpdates(() => {
    observed.push(`title:${getUpdateSnapshot().state?.status ?? ''}`);
  });
  const stopAbout = subscribeUpdates(() => {
    observed.push(`about:${getUpdateSnapshot().state?.status ?? ''}`);
  });

  try {
    expect(streams.size).toBe(1);
    emit(available);
    resolveRead({ ok: true, value: { ...available, revision: 1, status: 'idle' } });
    await Promise.resolve();
    expect(getUpdateSnapshot().state).toEqual(available);
    expect(observed).toEqual(['title:available', 'about:available']);
    emit({ ...available, revision: 3, status: 'error', retryOperation: 'check' });
    await actOnUpdate();
    expect(getUpdateSnapshot().state?.status).toBe('current');
    emit({ ...available, revision: 5, status: 'error', retryOperation: 'install' });
    await actOnUpdate();
    expect(getUpdateSnapshot().state?.status).toBe('updating');
    await actOnUpdate();
    expect(actions).toEqual(['check', 'install']);
    emit({ ...available, revision: 7, status: 'error', retryOperation: 'restart' });
    await actOnUpdate();
    expect(actions).toEqual(['check', 'install', 'restart']);
    stopTitle();
    expect(streams.size).toBe(1);
    stopAbout();
    expect(streams.size).toBe(0);
    const retired = getUpdateSnapshot();

    emit({ ...available, revision: 8, status: 'ready' });
    expect(getUpdateSnapshot()).toBe(retired);
  } finally {
    stopTitle();
    stopAbout();
    vi.unstubAllGlobals();
  }
});
