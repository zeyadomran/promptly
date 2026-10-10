import { useWindowRecovery } from '../hooks/use-window-recovery';
import { usePreferences } from '../settings-context';
import { LoginSettings } from './LoginSettings';
import { SettingChoice } from './SettingChoice';
import { SettingSwitch } from './SettingSwitch';

export function GeneralSettings() {
  const { settings } = usePreferences();
  const recovery = useWindowRecovery();

  return (
    <>
      <LoginSettings />
      <SettingChoice
        label="Quick compose adds to"
        description="The destination for a new global shortcut draft."
        value={settings.composeDestination}
        choices={[
          { value: 'queue', label: 'Queue' },
          { value: 'library', label: 'Library' }
        ]}
        patch={(value) =>
          value === 'queue' || value === 'library' ? { composeDestination: value } : undefined
        }
      />
      <SettingSwitch
        label="Show in system tray"
        description={
          recovery?.trayController === true
            ? 'Open Promptly from the status icon.'
            : 'The status icon is not available yet.'
        }
        checked={recovery?.tray === true}
        disabled={recovery?.trayController !== true}
        patch={(showInTray) => ({ showInTray })}
      />
      <SettingChoice
        label="Default size"
        description="The size used when Promptly starts. Your current window size stays unchanged."
        value={settings.defaultSizeMode}
        choices={[
          { value: 'compact', label: 'Compact' },
          { value: 'regular', label: 'Regular' }
        ]}
        patch={(defaultSizeMode) =>
          defaultSizeMode === 'compact' || defaultSizeMode === 'regular'
            ? { defaultSizeMode }
            : undefined
        }
      />
    </>
  );
}
