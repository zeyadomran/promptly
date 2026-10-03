import { GlobalShortcutSettings } from '../../shortcuts/components/GlobalShortcutSettings';
import { RetryShortcuts } from '../../shortcuts/components/RetryShortcuts';
import { ShortcutGroup } from '../../shortcuts/components/ShortcutGroup';
import { useShortcutPreferences } from '../../shortcuts/hooks/use-shortcut-preferences';
import { useShortcutRecording } from '../../shortcuts/hooks/use-shortcut-recording';
import { useShortcutStatus } from '../../shortcuts/hooks/use-shortcut-status';
import { LocalShortcutSettings } from './LocalShortcutSettings';
import { ResetShortcutsButton } from './ResetShortcutsButton';
import { SettingSwitch } from './SettingSwitch';

export function ShortcutSettings() {
  const preferences = useShortcutPreferences();
  const recording = useShortcutRecording();
  const status = useShortcutStatus(preferences.revision, recording.snapshot.phase);
  const disabled = preferences.pending || window.promptly.platform === 'unsupported';
  const inactive = disabled || recording.snapshot.phase !== 'idle';
  const { settings } = preferences;

  return (
    <div className="shortcut-settings">
      <div className="shortcut-settings-heading">
        <div>
          <h1 id="settings-shortcuts-heading" tabIndex={-1}>
            Shortcuts
          </h1>
          <p>Keyboard access to Promptly. Hover a row for details.</p>
        </div>
        <ResetShortcutsButton disabled={inactive} apply={preferences.apply} />
      </div>
      <GlobalShortcutSettings
        preferences={preferences}
        recording={recording}
        status={status}
        disabled={disabled}
      />
      {preferences.error !== undefined && (
        <p className="settings-row-error" role="alert">
          {preferences.error}
        </p>
      )}
      <RetryShortcuts status={status} disabled={inactive} />
      <LocalShortcutSettings
        preferences={preferences}
        recording={recording}
        disabled={preferences.pending}
      />
      <ShortcutGroup title="When saving">
        <SettingSwitch
          label="Show confirmation toast"
          description="Confirm when a selection is saved."
          checked={settings.showConfirmationToast}
          disabled={inactive}
          patch={(showConfirmationToast) => ({ showConfirmationToast })}
        />
        <SettingSwitch
          label="Trim whitespace and terminal prompts"
          description="Normalize captured text before saving."
          checked={settings.normalizeWhitespace}
          disabled={inactive}
          patch={(normalizeWhitespace) => ({ normalizeWhitespace })}
        />
      </ShortcutGroup>
    </div>
  );
}
