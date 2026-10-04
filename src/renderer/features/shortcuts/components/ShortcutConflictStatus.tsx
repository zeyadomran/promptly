import type { ShortcutStatus } from '../../../../shared/contracts/shortcuts';
import { shortcutGroupRegistration } from '../shortcut-group-registration';
import { ShortcutStatusIndicator } from './ShortcutStatusIndicator';

export function ShortcutConflictStatus({
  status,
  error,
  captureKind
}: {
  status: ShortcutStatus | undefined;
  error: string | undefined;
  captureKind: 'double-tap' | 'combination';
}) {
  const registration = shortcutGroupRegistration(status, captureKind);

  return (
    <div className="shortcut-conflict-status" aria-live="polite">
      {error !== undefined && (
        <p className="settings-row-error" role="alert">
          {error}
        </p>
      )}
      <ShortcutStatusIndicator {...registration} />
    </div>
  );
}
