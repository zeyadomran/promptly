import type { ShortcutStatus } from '../../../shared/contracts/shortcuts';
import { shortcutRegistration } from './shortcut-registration';

export function shortcutGroupRegistration(
  status: ShortcutStatus | undefined,
  captureKind: 'double-tap' | 'combination'
) {
  if (status === undefined || status.quarantined || status.recording || status.hook === 'suspended')
    return shortcutRegistration(status, 'capture', captureKind);
  const names = { capture: 'Capture', open: 'Open', pin: 'Pin', compose: 'Compose' };
  const registrations = (['capture', 'open', 'pin', 'compose'] as const).map((action) => ({
    ...shortcutRegistration(status, action, captureKind),
    action: names[action]
  }));
  const unavailable = registrations.filter((item) => item.state === 'unavailable');
  const neutral = registrations.filter(
    (item) => item.state === 'neutral' && item.label !== 'Not set'
  );

  if (unavailable.length === 0 && neutral.length === 0)
    return {
      state: 'registered' as const,
      label: 'All registered',
      detail:
        'All configured shortcuts are available. Capture still requires a supported native selection in the source app.'
    };
  const affected = unavailable.length > 0 ? unavailable : neutral;
  const first = affected[0];

  return {
    state: unavailable.length > 0 ? ('unavailable' as const) : ('neutral' as const),
    label:
      unavailable.length === 1
        ? `${first?.action ?? 'Shortcut'} unavailable`
        : unavailable.length > 1
          ? `${String(unavailable.length)} unavailable`
          : (first?.label ?? 'Checking'),
    detail: affected.map((item) => `${item.action}: ${item.detail}`).join(' ')
  };
}
