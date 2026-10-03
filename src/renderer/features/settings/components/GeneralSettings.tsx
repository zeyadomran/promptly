import { useWindowRecovery } from '../hooks/use-window-recovery';
import { usePreferences } from '../settings-context';
import { SettingChoice } from './SettingChoice';
import { SettingSwitch } from './SettingSwitch';

export function GeneralSettings() {
  const { settings } = usePreferences();
  const recovery = useWindowRecovery();

  return (
    <>
      <SettingSwitch
        label="Launch at login"
        description="Open Promptly when you sign in to your computer."
        checked={settings.launchAtLogin}
        disabled={window.promptly.platform === 'unsupported'}
        patch={(launchAtLogin) => ({ launchAtLogin })}
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
