import type { Settings } from '../../shared/contracts/settings';
import type { ShortcutStatus } from '../../shared/contracts/shortcuts';
import type { HookHealth } from '../platform/keyboard/keyboard-hook';
import type { Accelerators } from './accelerators';
import { shortcutLabel } from './bindings';

interface Flags {
  sleeping: boolean;
  paused: boolean;
  recording: boolean;
  captureAvailable: boolean;
}

export function shortcutStatus(
  settings: Settings | undefined,
  health: HookHealth | undefined,
  accelerators: Accelerators,
  flags: Flags,
  platform: NodeJS.Platform
): ShortcutStatus {
  const capture = settings?.saveShortcut;
  const doubleTap = capture?.kind === 'double-tap';

  return {
    capture:
      !accelerators.failed &&
      (doubleTap ? health?.installed === true : accelerators.registered('capture'))
        ? 'registered'
        : 'unavailable',
    open: accelerators.registered('open') ? 'registered' : 'unavailable',
    pin:
      settings?.pinShortcut === null
        ? 'disabled'
        : accelerators.registered('pin')
          ? 'registered'
          : 'unavailable',
    compose:
      settings?.composeShortcut === null
        ? 'disabled'
        : accelerators.registered('compose')
          ? 'registered'
          : 'unavailable',
    hook: flags.sleeping ? 'suspended' : health?.installed === true ? 'installed' : 'unavailable',
    capturePaused: flags.paused,
    recording: flags.recording,
    quarantined: accelerators.failed,
    captureHandlerAvailable: flags.captureAvailable,
    labels: {
      capture: doubleTap
        ? `${shortcutLabel(`${capture.modifier}+Space`, platform).replace('Space', '').replace(/\+$/, '')} × 2`
        : capture === undefined
          ? ''
          : shortcutLabel(capture.accelerator, platform),
      open: settings === undefined ? '' : shortcutLabel(settings.openShortcut, platform),
      pin:
        settings?.pinShortcut === null || settings === undefined
          ? null
          : shortcutLabel(settings.pinShortcut, platform),
      compose:
        settings?.composeShortcut === undefined ||
        settings.composeShortcut === null ||
        !accelerators.registered('compose') ||
        flags.recording ||
        flags.sleeping
          ? null
          : shortcutLabel(settings.composeShortcut, platform)
    }
  };
}
