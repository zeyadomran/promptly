import { useLayoutEffect, useSyncExternalStore } from 'react';

import {
  applyTheme,
  getSystemTheme,
  subscribeSystemTheme,
  type ThemePreference
} from '../lib/theme';

/** One owner per window. P05 supplies the persisted preference before first paint. */
export function useTheme(preference: ThemePreference) {
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, getSystemTheme);

  useLayoutEffect(() => {
    applyTheme(preference);
  }, [preference]);

  return preference === 'system' ? systemTheme : preference;
}
