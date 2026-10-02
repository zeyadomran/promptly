// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { closeSettingsStorage } from './close-settings-storage';

describe('settings shutdown dependency', () => {
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
