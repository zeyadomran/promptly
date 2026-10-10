import { createContext, useContext } from 'react';

import type { ShellCommand } from '../../../shared/contracts/window';

export const settingsSectionIds = [
  'general',
  'shortcuts',
  'appearance',
  'tags',
  'storage',
  'about'
] as const;
export type SettingsSectionId = (typeof settingsSectionIds)[number];
export type ShellView = 'library' | 'queue' | 'settings' | 'wiki';
export interface ShellNavigation {
  view: ShellView;
  settingsSection: SettingsSectionId;
  settingsRequest: number;
  showLibrary: () => void;
  showQueue: () => void;
  compose: (destination: 'library' | 'queue') => void;
  composeCommand: (ShellCommand & { request: number }) | undefined;
  showSettings: (section?: SettingsSectionId) => void;
  showWiki: () => void;
  toggleView: (view: 'settings' | 'wiki') => void;
}
export const ShellNavigationContext = createContext<ShellNavigation | undefined>(undefined);
export function useShellNavigation() {
  const navigation = useContext(ShellNavigationContext);

  if (navigation === undefined) throw new Error('Shell navigation is unavailable.');
  return navigation;
}
