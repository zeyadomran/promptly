import type { ShortcutStatus } from '../../../shared/contracts/shortcuts';

export function shortcutRegistration(
  status: ShortcutStatus | undefined,
  action: 'capture' | 'open' | 'pin'
) {
  if (status === undefined)
    return {
      state: 'neutral',
      label: 'Checking',
      detail: 'Shortcut registration has not been verified yet.'
    } as const;
  if (status.quarantined)
    return {
      state: 'unavailable',
      label: 'Restart required',
      detail: 'Shortcut recovery requires restarting Promptly.'
    } as const;
  if (status.recording || status.hook === 'suspended')
    return {
      state: 'neutral',
      label: 'Suppressed',
      detail: 'Global shortcuts are suppressed while recording or while the session is suspended.'
    } as const;
  if (action === 'capture' && status.capturePaused)
    return { state: 'neutral', label: 'Paused', detail: 'Selection capture is paused.' } as const;
  if (action === 'capture' && !status.captureHandlerAvailable)
    return {
      state: 'unavailable',
      label: 'Saving unavailable',
      detail: 'Selection saving is not available.'
    } as const;
  if (status[action] === 'disabled')
    return {
      state: 'neutral',
      label: 'Not set',
      detail: 'This optional shortcut has no binding.'
    } as const;
  if (status[action] === 'unavailable')
    return {
      state: 'unavailable',
      label:
        action === 'capture' && status.hook === 'unavailable'
          ? 'Listener unavailable'
          : 'Windows didn’t accept this',
      detail:
        'Registration or the modifier listener is unavailable. Choose another shortcut or retry after freeing the current binding.'
    } as const;
  return {
    state: 'registered',
    label: 'Registered',
    detail:
      'The listener or OS registration is available. Registration alone does not verify delivery in another app.'
  } as const;
}
