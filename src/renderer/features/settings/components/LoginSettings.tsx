import { useLoginStatus } from '../hooks/use-login-status';
import { usePreferences } from '../settings-context';
import { SettingSwitch } from './SettingSwitch';

export function LoginSettings() {
  const { revision } = usePreferences();
  const status = useLoginStatus(revision);
  const description =
    status?.available !== true
      ? 'Windows startup status could not be verified. Your saved preference is retained.'
      : status.enabled
        ? `Windows will launch Promptly when you sign in.${status.requested ? '' : ' Your saved preference is off.'}`
        : status.requested
          ? `${status.registered ? 'Disabled in Windows startup settings.' : 'Not registered with Windows.'} Your saved preference is on. Turn this on to enable startup.`
          : 'Open Promptly when you sign in to your computer.';

  return (
    <SettingSwitch
      label="Launch at login"
      description={description}
      checked={status?.available === true && status.enabled}
      disabled={status?.available !== true || window.promptly.platform === 'unsupported'}
      patch={(launchAtLogin) => ({ launchAtLogin })}
    />
  );
}
