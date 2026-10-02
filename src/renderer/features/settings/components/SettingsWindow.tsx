import { useState } from 'react';

import { Tabs } from '../../../components/ui/tabs';
import { TagsSettings } from '../../tags/TagsSettings';
import { useWideSettings } from '../hooks/use-wide-settings';
import { AppearanceSettings } from './AppearanceSettings';
import { GeneralSettings } from './GeneralSettings';
import { SettingsNavigation } from './SettingsNavigation';
import { SettingsSection } from './SettingsSection';
import { ShortcutSettings } from './ShortcutSettings';
import { StorageSettings } from './StorageSettings';

export function SettingsWindow() {
  const [section, setSection] = useState('general');
  const wide = useWideSettings();

  return (
    <Tabs
      className="settings-window"
      orientation={wide ? 'vertical' : 'horizontal'}
      value={section}
      onValueChange={setSection}
    >
      <SettingsNavigation />
      <div className="settings-content">
        <SettingsSection
          value="general"
          title="General"
          description="Make Promptly fit your daily workflow."
        >
          <GeneralSettings />
        </SettingsSection>
        <SettingsSection
          value="shortcuts"
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
      </div>
    </Tabs>
  );
}
