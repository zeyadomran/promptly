import type { ShortcutStatus } from '../../../../shared/contracts/shortcuts';
import { ResetShortcutsButton } from '../../settings/components/ResetShortcutsButton';
import type { useShortcutPreferences } from '../hooks/use-shortcut-preferences';
import type { useShortcutRecording } from '../hooks/use-shortcut-recording';
import { shortcutRegistration } from '../shortcut-registration';
import { AltSpaceAdvisory } from './AltSpaceAdvisory';
import { CaptureShortcutMode } from './CaptureShortcutMode';
import { ShortcutBindingControl } from './ShortcutBindingControl';
import { ShortcutConflictStatus } from './ShortcutConflictStatus';
import { ShortcutGroup } from './ShortcutGroup';
import { ShortcutRow } from './ShortcutRow';
import { ShortcutStatusIndicator } from './ShortcutStatusIndicator';

export function GlobalShortcutSettings({
  preferences,
  recording,
  status,
  disabled
}: {
  preferences: ReturnType<typeof useShortcutPreferences>;
  recording: ReturnType<typeof useShortcutRecording>;
  status: ShortcutStatus | undefined;
  disabled: boolean;
}) {
  const { settings, apply } = preferences;
  const inactive = disabled || recording.snapshot.phase !== 'idle';

  return (
    <ShortcutGroup
      title="Global"
      description="Works from any app"
      status={
        <>
          <div className="shortcut-global-reset">
            <ResetShortcutsButton disabled={inactive} apply={apply} />
          </div>
          <ShortcutConflictStatus status={status} error={undefined} />
        </>
      }
    >
      <div className="shortcut-capture-row">
        <CaptureShortcutMode
          value={settings.saveShortcut}
          disabled={disabled}
          recording={recording}
          onChange={(saveShortcut) => apply({ saveShortcut })}
          inspect={(binding) => preferences.inspect('save', binding)}
          onSwap={(binding, collision) => preferences.swap('save', binding, collision.action)}
          tapWindow={{
            value: settings.doubleTapWindowMs,
            onChange: (doubleTapWindowMs) => apply({ doubleTapWindowMs })
          }}
        />
      </div>
      <ShortcutRow
        label="Open Promptly"
        description="Show or hide the main window."
        status={<ShortcutStatusIndicator {...shortcutRegistration(status, 'open')} />}
      >
        <ShortcutBindingControl
          target="open"
          label="Open Promptly"
          preferences={preferences}
          recording={recording}
          disabled={disabled}
        />
      </ShortcutRow>
      <AltSpaceAdvisory preferences={preferences} disabled={inactive} />
      <ShortcutRow
        label="Toggle always on top"
        description="Pin or unpin Promptly. Optional."
        status={<ShortcutStatusIndicator {...shortcutRegistration(status, 'pin')} />}
      >
        <ShortcutBindingControl
          target="pin"
          label="Toggle always on top"
          optional
          preferences={preferences}
          recording={recording}
          disabled={disabled}
        />
      </ShortcutRow>
    </ShortcutGroup>
  );
}
