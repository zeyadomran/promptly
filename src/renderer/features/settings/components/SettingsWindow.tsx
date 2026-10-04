import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { TagsSettings } from '../../tags/TagsSettings';
import {
  type SettingsSectionId,
  settingsSectionIds,
  useShellNavigation
} from '../../window-chrome/shell-navigation';
import { AppearanceSettings } from './AppearanceSettings';
import { ApplicationSettings } from './ApplicationSettings';
import { GeneralSettings } from './GeneralSettings';
import { SettingsNavigation } from './SettingsNavigation';
import { SettingsSection } from './SettingsSection';
import { ShortcutSettings } from './ShortcutSettings';
import { StorageSettings } from './StorageSettings';

export function SettingsWindow() {
  const { settingsSection, settingsRequest } = useShellNavigation();
  const [active, setActive] = useState<SettingsSectionId>('general');
  const scroller = useRef<HTMLDivElement>(null);
  const navigate = useCallback((section: SettingsSectionId) => {
    const root = scroller.current;
    const target = root?.querySelector<HTMLElement>(`#settings-${section}`);

    if (root === null || target === undefined || target === null) return;
    root.scrollTo({
      top:
        target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 24,
      behavior: 'instant'
    });
    setActive(section);
    target.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    navigate(settingsSection);
  }, [settingsSection, settingsRequest, navigate]);
  const spy = () => {
    const root = scroller.current;

    if (root === null) return;
    const top = root.getBoundingClientRect().top;
    let current: SettingsSectionId = 'general';

    for (const section of settingsSectionIds) {
      const target = root.querySelector<HTMLElement>(`#settings-${section}`);

      if (target !== null && target.getBoundingClientRect().top <= top + 48) current = section;
    }

    if (root.scrollTop + root.clientHeight >= root.scrollHeight - 1) current = 'about';
    setActive(current);
  };

  return (
    <div className="settings-window">
      <SettingsNavigation active={active} navigate={navigate} />
      <div className="settings-content" ref={scroller} onScroll={spy}>
        <div className="settings-column">
          <SettingsSection
            value="general"
            title="General"
            description="Make Promptly fit your daily workflow."
          >
            <GeneralSettings />
          </SettingsSection>
          <SettingsSection
            value="shortcuts"
            grouped={false}
            title="Shortcuts"
            description="Keyboard access to Promptly."
          >
            <ShortcutSettings />
          </SettingsSection>
          <SettingsSection
            value="appearance"
            title="Appearance"
            description="Choose how Promptly looks and stays on your desktop."
          >
            <AppearanceSettings />
          </SettingsSection>
          <SettingsSection value="tags" title="Tags" description="Organize snippets with tags.">
            <TagsSettings />
          </SettingsSection>
          <SettingsSection
            value="storage"
            title="Storage"
            description="Your library is stored locally."
          >
            <StorageSettings />
          </SettingsSection>
          <SettingsSection
            value="about"
            title="About"
            description="Promptly version, updates and guides."
          >
            <ApplicationSettings />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
