import { acceleratorKey } from '../../../../shared/shortcuts/accelerator';
import { Button } from '../../../components/ui/button';
import { CaptureShortcutMode } from '../../shortcuts/components/CaptureShortcutMode';
import { DoubleTapWindow } from '../../shortcuts/components/DoubleTapWindow';
import { ShortcutConflictStatus } from '../../shortcuts/components/ShortcutConflictStatus';
import { ShortcutRecorder } from '../../shortcuts/components/ShortcutRecorder';
import { useShortcutPreferences } from '../../shortcuts/hooks/use-shortcut-preferences';
import { useShortcutRecording } from '../../shortcuts/hooks/use-shortcut-recording';
import { useShortcutStatus } from '../../shortcuts/hooks/use-shortcut-status';
import { LocalShortcutSettings } from './LocalShortcutSettings';
import { ResetShortcutsButton } from './ResetShortcutsButton';
import { SettingsRow } from './SettingsRow';
import { SettingSwitch } from './SettingSwitch';

export function ShortcutSettings() {
  const { settings, revision, pending, error, apply } = useShortcutPreferences();
  const recording = useShortcutRecording();
  const status = useShortcutStatus(revision, recording.snapshot.phase);
  const disabled = pending || window.promptly.platform === 'unsupported';
  const inactive = disabled || recording.snapshot.phase !== 'idle';
  const windowsAltSpace =
    window.promptly.platform === 'win32' &&
    acceleratorKey(settings.openShortcut, 'win32') === 'alt+space';

  return (
    <>
      <CaptureShortcutMode
        value={settings.saveShortcut}
        disabled={disabled}
        recording={recording}
        onChange={(saveShortcut) => apply({ saveShortcut })}
      />
      <SettingsRow
        label="Open Promptly"
        description="Show or hide the main window."
        disabled={disabled}
      >
        <ShortcutRecorder
          label="Open Promptly"
          value={settings.openShortcut}
          recording={recording}
          onChange={(openShortcut) =>
            openShortcut === null ? Promise.resolve() : apply({ openShortcut })
          }
        />
      </SettingsRow>
      {windowsAltSpace && (
        <div className="shortcut-system-warning">
          <p>
            Alt+Space is also Windows’ window menu shortcut and may conflict.
            {status?.open === 'unavailable'
              ? ' Windows did not register the current binding.'
              : ' Check delivery in your apps before relying on it.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={inactive}
            onClick={() => {
              void apply({ openShortcut: 'Control+Alt+Space' }).catch(() => undefined);
            }}
          >
            Try Ctrl+Alt+Space
          </Button>
          <p>Applies only if Windows accepts registration. Native delivery still needs checking.</p>
        </div>
      )}
      <SettingsRow
        label="Toggle always on top"
        description="Optional global shortcut to pin or unpin Promptly."
        disabled={disabled}
      >
        <ShortcutRecorder
          label="Toggle always on top"
          value={settings.pinShortcut}
          optional
          recording={recording}
          onChange={(pinShortcut) => apply({ pinShortcut })}
        />
      </SettingsRow>
      <DoubleTapWindow
        value={settings.doubleTapWindowMs}
        disabled={inactive}
        onChange={(doubleTapWindowMs) => apply({ doubleTapWindowMs })}
      />
      <ShortcutConflictStatus status={status} error={error} />
      <LocalShortcutSettings
        value={settings.localShortcuts}
        recording={recording}
        disabled={pending}
        onChange={(localShortcuts) => apply({ localShortcuts })}
      />
      <ResetShortcutsButton disabled={inactive} apply={apply} />
      <h2 className="shortcut-group-heading">When saving</h2>
      <SettingSwitch
        label="Show confirmation toast"
        description="Confirm when a selection is saved."
        checked={settings.showConfirmationToast}
        patch={(showConfirmationToast) => ({ showConfirmationToast })}
      />
      <SettingSwitch
        label="Trim whitespace and terminal prompts"
        description="Normalize captured text before saving."
        checked={settings.normalizeWhitespace}
        patch={(normalizeWhitespace) => ({ normalizeWhitespace })}
      />
    </>
  );
}
