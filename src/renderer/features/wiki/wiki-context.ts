import { createContext, useContext } from 'react';

import type { WikiPageId, WikiResource } from '../../../shared/contracts/wiki';
import type { WikiSettingsSection } from './wiki-navigation';

export interface WikiNavigation {
  showPage: (page: WikiPageId) => void;
  showSettings: (section: WikiSettingsSection) => void;
  openResource: (resource: WikiResource) => void;
}
export const WikiNavigationContext = createContext<WikiNavigation | undefined>(undefined);
export function useWikiNavigation() {
  const navigation = useContext(WikiNavigationContext);

  if (navigation === undefined) throw new Error('Wiki navigation is unavailable.');
  return navigation;
}
