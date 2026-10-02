// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultSettings } from '../../shared/contracts/settings';
import { createDockController, dockDeadlineMs } from './dock-controller';
import { testSettings } from './settings-test-fixture';

describe('bounded native Dock visibility', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bounds startup when show never settles and clears the deadline after success', async () => {
    vi.useFakeTimers();
    const controller = createDockController({
      show: () => new Promise(() => undefined),
      hide: () => undefined,
      isVisible: () => false
    });
    const failed = expect(controller.apply(defaultSettings())).rejects.toThrow('timed out');

    await vi.advanceTimersByTimeAsync(dockDeadlineMs);
    await failed;
    expect(vi.getTimerCount()).toBe(0);
    let visible = false;
    const succeeds = createDockController({
      show: () => {
        visible = true;
        return Promise.resolve();
      },
      hide: () => {
        visible = false;
      },
      isVisible: () => visible
    });

    await succeeds.apply(defaultSettings());
    expect(visible).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles settings and shutdown after timeout, then repairs late show completion to the rolled back preference', async () => {
    vi.useFakeTimers();
    let visible = true;
    let finish: (() => void) | undefined;
    const controller = createDockController({
      show: () =>
        new Promise<void>((resolve) => {
          finish = () => {
            visible = true;
            resolve();
          };
        }),
      hide: () => {
        visible = false;
      },
      isVisible: () => visible
    });
    const fixture = testSettings({ available: [controller], unavailable: [] });

    try {
      await fixture.service.initialize();
      await fixture.service.services.updateSettings({ showDockIcon: false });
      const updating = fixture.service.services.updateSettings({ showDockIcon: true });

      await vi.advanceTimersByTimeAsync(0);
      const closing = fixture.service.close();

      await vi.advanceTimersByTimeAsync(dockDeadlineMs);
      expect(await updating).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
      await closing;
      expect(visible).toBe(false);
      expect(fixture.store.invoke('getSettings', {})).toMatchObject({
        revision: 1,
        settings: { showDockIcon: false }
      });
      finish?.();
      await vi.advanceTimersByTimeAsync(0);
      expect(visible).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      fixture.store.dispose();
    }
  });

  it('consumes a native rejection arriving after its deadline', async () => {
    vi.useFakeTimers();
    let reject: ((error: Error) => void) | undefined;
    const controller = createDockController({
      show: () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
      hide: () => undefined,
      isVisible: () => false
    });
    const failed = expect(controller.apply(defaultSettings())).rejects.toThrow('timed out');

    await vi.advanceTimersByTimeAsync(dockDeadlineMs);
    await failed;
    await controller.apply({ ...defaultSettings(), showDockIcon: false });
    reject?.(new Error('Late OS failure'));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
