import type { ReactNode } from 'react';

import { useSettings } from './hooks/use-settings';
import { SettingsContext } from './settings-context';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSettings(window.promptly, window.promptlyInitialSettings);

  return <SettingsContext value={settings}>{children}</SettingsContext>;
}
