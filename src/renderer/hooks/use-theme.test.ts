import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import type { ThemePreference } from '../lib/theme';
import { useTheme } from './use-theme';

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset['theme'];
});

it('follows OS changes only for System and cleans up the listener', () => {
  let dark = false;
  const listeners = new Set<() => void>();
  const media = {
    get matches() {
      return dark;
    },
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener)
  };

  vi.stubGlobal('matchMedia', () => media);

  const { result, rerender, unmount } = renderHook(
    ({ preference }: { preference: ThemePreference }) => useTheme(preference),
    { initialProps: { preference: 'system' as ThemePreference } }
  );

  expect(result.current).toBe('light');
  act(() => {
    dark = true;
    listeners.forEach((listener) => {
      listener();
    });
  });
  expect(result.current).toBe('dark');
  rerender({ preference: 'light' });
  expect(result.current).toBe('light');
  expect(document.documentElement.dataset['theme']).toBe('light');
  rerender({ preference: 'system' });
  expect(result.current).toBe('dark');
  unmount();
  expect(listeners.size).toBe(0);
});
