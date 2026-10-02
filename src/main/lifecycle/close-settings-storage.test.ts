// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { closeSettingsStorage } from './close-settings-storage';

describe('settings shutdown dependency', () => {
  it('keeps native resources live during settings drain and settles both resources after a rejection', async () => {
    let rejectSettings: ((reason: Error) => void) | undefined;
    let finishNative: (() => void) | undefined;
    const settingsError = new Error('Owned settings error');
    const storageError = new Error('Owned storage error');
    const settings = {
      close: () =>
        new Promise<void>((_, reject) => {
          rejectSettings = reject;
        })
    };
    const storage = { close: vi.fn(() => Promise.reject(storageError)) };
    const native = {
      close: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishNative = resolve;
          })
      )
    };
    const failed = vi.fn();
    const closing = closeSettingsStorage(settings, storage, native).catch(failed);

    expect(storage.close).not.toHaveBeenCalled();
    expect(native.close).not.toHaveBeenCalled();
    if (rejectSettings === undefined) throw new Error('Missing settings drain');
    rejectSettings(settingsError);
    await vi.waitFor(() => {
      expect(native.close).toHaveBeenCalledOnce();
    });
    expect(storage.close).toHaveBeenCalledOnce();
    expect(failed).not.toHaveBeenCalled();
    if (finishNative === undefined) throw new Error('Missing native cleanup');
    finishNative();
    await closing;
    expect(failed.mock.calls[0]?.[0]).toMatchObject({ errors: [settingsError, storageError] });
  });
  it('waits for accepted effects before closing storage and waits for close despite a drain rejection', async () => {
    let fail: ((error: Error) => void) | undefined;
    let finish: (() => void) | undefined;
    const settings = {
      close: () =>
        new Promise<void>((_resolve, reject) => {
          fail = reject;
        })
    };
    const storage = {
      close: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          })
      )
    };
    const settled = vi.fn();
    const closing = closeSettingsStorage(settings, storage).catch(settled);

    expect(storage.close).not.toHaveBeenCalled();
    fail?.(new Error('Drain failed'));
    await vi.waitFor(() => {
      expect(storage.close).toHaveBeenCalledOnce();
    });
    expect(settled).not.toHaveBeenCalled();
    finish?.();
    await closing;
    expect(settled).toHaveBeenCalledOnce();
  });
});
