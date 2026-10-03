import type { ShortcutStatus } from '../../../../shared/contracts/shortcuts';
import { shortcutRegistration } from '../shortcut-registration';
import { ShortcutStatusIndicator } from './ShortcutStatusIndicator';

export function ShortcutConflictStatus({
  status,
  error
}: {
  status: ShortcutStatus | undefined;
  error: string | undefined;
}) {
  const registrations = (['capture', 'open', 'pin'] as const).map((action) =>
    shortcutRegistration(status, action)
  );
  const unavailable = registrations.some((item) => item.state === 'unavailable');
  const registered = registrations.every(
    (item) => item.state === 'registered' || item.label === 'Not set'
  );

  return (
    <div className="shortcut-conflict-status" aria-live="polite">
      {error !== undefined && (
        <p className="settings-row-error" role="alert">
          {error}
        </p>
      )}
      <ShortcutStatusIndicator
        state={unavailable ? 'unavailable' : registered ? 'registered' : 'neutral'}
        label={
          unavailable
            ? 'Unavailable'
            : registered
              ? 'All registered'
              : (registrations[0]?.label ?? 'Checking')
        }
        detail={
          registrations.map((item) => item.detail).join(' ') +
          ' Checks cover known reserved bindings and OS registration. Other apps and every system shortcut cannot be scanned; registration alone does not verify delivery.'
        }
      />
    </div>
  );
}
