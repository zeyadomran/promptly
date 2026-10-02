import type { ReactNode } from 'react';

import { useSettings } from './hooks/use-settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  useSettings(window.promptly, window.promptlyInitialSettings);
  return children;
}
