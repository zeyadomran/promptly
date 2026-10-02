import { describe, expect, it, vi } from 'vitest';

import type { ChangeEvent } from '../../../../shared/contracts/domain';
import type { DesktopResult } from '../../../../shared/contracts/result';
import { defaultSettings, type SettingsSnapshot } from '../../../../shared/contracts/settings';
import { createSettingsClient } from './settings-client';

describe('renderer preference invalidation', () => {
  it('ignores stale responses, refetches the subscription handshake and stops on disposal', async () => {
    const replies: ((reply: DesktopResult<SettingsSnapshot>) => void)[] = [];
    let listener: ((event: ChangeEvent) => void) | undefined;
    const unsubscribe = vi.fn();
    const receive = vi.fn();
    const error = vi.fn();
    const stop = createSettingsClient(
      {
        getSettings: () =>
          new Promise((resolve) => {
            replies.push(resolve);
          }),
        subscribeChanges: (callback) => {
          listener = callback;
          return unsubscribe;
        }
      },
      receive,
      error
    );

    listener?.({ revision: 2, domains: ['settings'] });
    replies[0]?.({ ok: true, value: { revision: 0, settings: defaultSettings() } });
    replies[1]?.({
      ok: true,
      value: { revision: 2, settings: { ...defaultSettings(), theme: 'dark' } }
    });
    await Promise.resolve();
    expect(receive).toHaveBeenCalledExactlyOnceWith({
      revision: 2,
      settings: { ...defaultSettings(), theme: 'dark' }
    });
    listener?.({ revision: 1, domains: ['settings'] });
    listener?.({ revision: 3, domains: ['snippets'] });
    expect(replies).toHaveLength(2);
    listener?.({ revision: 4, domains: ['settings'] });
    stop();
    stop();
    replies[2]?.({ ok: true, value: { revision: 4, settings: defaultSettings() } });
    await Promise.resolve();
    expect(receive).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('bounds a read racing a commit and reports errors instead of replacing preferences', async () => {
    let listener: ((event: ChangeEvent) => void) | undefined;
    const getSettings = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: { revision: 0, settings: defaultSettings() } })
    );
    const receive = vi.fn();
    const error = vi.fn();
    const stop = createSettingsClient(
      {
        getSettings,
        subscribeChanges: (callback) => {
          listener = callback;
          return () => undefined;
        }
      },
      receive,
      error
    );

    listener?.({ revision: 5, domains: ['settings'] });
    await vi.waitFor(() => {
      expect(error).toHaveBeenCalledOnce();
    });
    expect(getSettings).toHaveBeenCalledTimes(3);
    expect(receive).not.toHaveBeenCalled();
    stop();
  });
});
