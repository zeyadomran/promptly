import { usePreferences } from '../settings-context';
import { SettingChoice } from './SettingChoice';
import { SettingSwitch } from './SettingSwitch';

export function AppearanceSettings() {
  const { settings } = usePreferences();

  return (
    <>
      <SettingChoice
        label="Theme"
        description="Choose a theme or follow your system appearance."
        value={settings.theme}
        choices={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'System' }
        ]}
        patch={(theme) =>
          theme === 'light' || theme === 'dark' || theme === 'system' ? { theme } : undefined
        }
      />
      <SettingSwitch
        label="Always on top"
        description="Keep Promptly above other windows. This also applies when Promptly starts."
        checked={settings.alwaysOnTop}
        patch={(alwaysOnTop) => ({ alwaysOnTop })}
      />
    </>
  );
}
