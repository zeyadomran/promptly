// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { closeDesktopServices } from './close-desktop-services';
import { createQuitCoordinator } from './quit-coordinator';

describe('combined desktop cleanup', () => {
  it.each(['storage', 'native'] as const)(
    'waits for the other service after %s fails quickly',
    async (fastService) => {
      let complete: (() => void) | undefined;
      const pending = new Promise<void>((resolve) => {
        complete = resolve;
      });
      const fastFailure = new Error(`Owned ${fastService} cleanup failure`);
      const fail = vi.fn(() => Promise.reject(fastFailure));
      const wait = vi.fn(() => pending);
      const cleanups = fastService === 'storage' ? [fail, wait] : [wait, fail];
      const quit = vi.fn();
      const onError = vi.fn();
      const handler = createQuitCoordinator({
        cleanup: () => closeDesktopServices(cleanups),
        quit,
        onError
      });
      const preventDefault = vi.fn();

      handler({ preventDefault });
      await vi.waitFor(() => {
        expect(fail).toHaveBeenCalledOnce();
      });
      handler({ preventDefault });
      expect(wait).toHaveBeenCalledOnce();
      expect(preventDefault).toHaveBeenCalledTimes(2);
      expect(quit).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      if (complete === undefined) throw new Error('Missing pending cleanup');
      complete();
      await vi.waitFor(() => {
        expect(quit).toHaveBeenCalledOnce();
      });
      expect(onError.mock.calls[0]?.[0]).toMatchObject({ errors: [fastFailure] });
      handler({ preventDefault });
      expect(preventDefault).toHaveBeenCalledTimes(2);
    }
  );

  it('starts all cleanups even if one throws synchronously, then aggregates both failures', async () => {
    const storageFailure = new Error('Owned storage failure');
    const nativeFailure = new Error('Owned native failure');
    const second = vi.fn(() => Promise.reject(nativeFailure));

    await expect(
      closeDesktopServices([
        () => {
          throw storageFailure;
        },
        second
      ])
    ).rejects.toMatchObject({ errors: [storageFailure, nativeFailure] });
    expect(second).toHaveBeenCalledOnce();
  });
});
