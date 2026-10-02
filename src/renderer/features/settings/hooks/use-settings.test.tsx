import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import type { DesktopResult } from '../../../../shared/contracts/result';
import { defaultSettings, type SettingsSnapshot } from '../../../../shared/contracts/settings';
import { useSettings } from './use-settings';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('accepts an authoritative mutation immediately and never regresses to a delayed older read', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
  let oldRead: ((value: DesktopResult<SettingsSnapshot>) => void) | undefined;
  const initial = { revision: 0, settings: defaultSettings() };
  const committed = { revision: 2, settings: { ...initial.settings, theme: 'dark' as const } };
  const bridge = {
    getSettings: () =>
      new Promise<DesktopResult<SettingsSnapshot>>((resolve) => {
        oldRead = resolve;
      }),
    updateSettings: () => Promise.resolve({ ok: true as const, value: committed }),
    subscribeChanges: () => () => undefined
  };
  const { result } = renderHook(() => useSettings(bridge, initial));

  await act(async () => {
    await result.current.update({ theme: 'dark' });
  });
  expect(result.current.settings.theme).toBe('dark');
  await act(async () => {
    oldRead?.({ ok: true, value: initial });
    await Promise.resolve();
  });
  expect(result.current.revision).toBe(2);
  expect(result.current.settings.theme).toBe('dark');
});
