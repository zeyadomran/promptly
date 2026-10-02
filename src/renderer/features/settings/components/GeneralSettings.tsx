import { useWindowRecovery } from '../hooks/use-window-recovery';
import { usePreferences } from '../settings-context';
import { SettingChoice } from './SettingChoice';
import { SettingSwitch } from './SettingSwitch';

export function GeneralSettings() {
  const { settings } = usePreferences();
  const recovery = useWindowRecovery();
  const mac = window.promptly.platform === 'darwin';
  const route = recovery?.tray === true || recovery?.shortcut === true;

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
        label={mac ? 'Show in menu bar' : 'Show in system tray'}
        description={
          recovery?.trayController === true
            ? 'Open Promptly from the status icon.'
            : 'The status icon is not available yet.'
        }
        checked={recovery?.tray === true}
        disabled={recovery?.trayController !== true}
        patch={(showInTray) => ({ showInTray })}
      />
      {mac && (
        <SettingSwitch
          label="Show Dock icon"
          description={
            route
              ? 'Open Promptly from the Dock.'
              : 'Promptly stays visible when its Dock icon is hidden.'
          }
          checked={recovery?.dock === true}
          disabled={recovery === undefined}
          patch={(showDockIcon) => ({ showDockIcon })}
        />
      )}
      <SettingChoice
        label="Hide after copy"
        description={
          settings.hideAfterCopy === 'automatic'
            ? `Automatic ${settings.alwaysOnTop ? 'keeps the window visible while pinned' : 'hides the window when it is not pinned'}.`
            : 'Choose whether copying hides the window.'
        }
        value={settings.hideAfterCopy}
        choices={[
          { value: 'automatic', label: 'Automatic' },
          { value: 'always', label: 'Always' },
          { value: 'never', label: 'Never' }
        ]}
        patch={(hideAfterCopy) =>
          hideAfterCopy === 'automatic' || hideAfterCopy === 'always' || hideAfterCopy === 'never'
            ? { hideAfterCopy }
            : undefined
        }
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
