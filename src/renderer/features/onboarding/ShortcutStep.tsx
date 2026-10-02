import { CaptureShortcutMode } from '../shortcuts/components/CaptureShortcutMode';
import { ShortcutConflictStatus } from '../shortcuts/components/ShortcutConflictStatus';
import type { useShortcutPreferences } from '../shortcuts/hooks/use-shortcut-preferences';
import type { useShortcutRecording } from '../shortcuts/hooks/use-shortcut-recording';
import { useShortcutStatus } from '../shortcuts/hooks/use-shortcut-status';

export function ShortcutStep({
  recording,
  preferences,
  pending
}: {
  recording: ReturnType<typeof useShortcutRecording>;
  preferences: ReturnType<typeof useShortcutPreferences>;
  pending: boolean;
}) {
  const status = useShortcutStatus(preferences.revision, recording.snapshot.phase);

  return (
    <div className="onboarding-step-body">
      <h1 tabIndex={-1}>Make it your own</h1>
      <p className="onboarding-description">
        Keep the recommended double-tap, or record a key combination.
      </p>
      <CaptureShortcutMode
        value={preferences.settings.saveShortcut}
        recording={recording}
        disabled={pending || preferences.pending}
        onChange={(saveShortcut) => preferences.apply({ saveShortcut })}
      />
      <ShortcutConflictStatus status={status} error={preferences.error} />
    </div>
  );
}
