import type { ShortcutStatus } from '../../../shared/contracts/shortcuts';

export function shortcutRegistration(
  status: ShortcutStatus | undefined,
  action: 'capture' | 'open' | 'pin' | 'compose',
  captureKind: 'double-tap' | 'combination' = 'double-tap'
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
        action === 'capture' && captureKind === 'double-tap'
          ? 'Listener unavailable'
          : 'Windows didn’t accept this',
      detail:
        action === 'capture' && captureKind === 'double-tap'
          ? 'The modifier listener is unavailable. Retry shortcuts or restart Promptly.'
          : 'The operating system did not register this shortcut. Another app may be using it. Choose another combination or free it and retry.'
    } as const;
  return {
    state: 'registered',
    label: 'Registered',
    detail:
      action === 'capture'
        ? 'The capture shortcut is available. Saving still requires a supported native selection in the source app.'
        : 'The operating system registered this shortcut. Registration alone does not verify delivery in another app.'
  } as const;
}
