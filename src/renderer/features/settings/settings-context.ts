import { createContext, useContext } from 'react';

import type { useSettings } from './hooks/use-settings';

export const SettingsContext = createContext<ReturnType<typeof useSettings> | undefined>(undefined);

export function usePreferences() {
  const preferences = useContext(SettingsContext);

  if (preferences === undefined) throw new Error('Preferences provider is missing.');
  return preferences;
}
