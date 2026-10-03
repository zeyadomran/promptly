import type { HookFrame } from '../../shared/contracts/shortcuts';
import type { ShortcutAction } from './bindings';
import type { CaptureAdmission } from './capture-admission';
import type { ShortcutCommands } from './commands';
import type { DoubleTap } from './double-tap';
import type { ShortcutTesting } from './shortcut-testing';

export type { ShortcutAction } from './bindings';
export type { ShortcutCommands } from './commands';

export interface ShortcutGuards {
  closing: boolean;
  sleeping: boolean;
  paused: boolean;
  recording: boolean;
  quarantined: boolean;
}

export function shortcutRetryAllowed(flags: ShortcutGuards): boolean {
  return !flags.closing && !flags.sleeping && !flags.recording && !flags.quarantined;
}

export function captureBlocked(flags: ShortcutGuards, testing: boolean): boolean {
  return !shortcutRetryAllowed(flags) || flags.paused || testing;
}

export function dispatchShortcut(
  action: ShortcutAction,
  commands: ShortcutCommands,
  flags: ShortcutGuards,
  testing: ShortcutTesting
): void {
  if (action === 'capture' && testing.active) {
    if (!captureBlocked(flags, false)) testing.combination();
    return;
  }

  if (
    !shortcutRetryAllowed(flags) ||
    (action === 'capture' && captureBlocked(flags, testing.blocked))
  )
    return;
  try {
    commands[action]();
  } catch {
    /* Commands cannot escape an OS callback. */
  }
}

export function receiveShortcutFrame(
  frame: HookFrame,
  ports: {
    testing: ShortcutTesting;
    taps: DoubleTap;
    admission: CaptureAdmission;
    blocked: boolean;
    installed: boolean;
    doubleTap: boolean;
  }
): void {
  if (ports.testing.receive(frame, ports.installed)) {
    ports.taps.reset(ports.testing.mask);
    return;
  }

  if (frame.kind === 'health' || frame.kind === 'reset' || frame.kind === 'ready')
    ports.admission.invalidate();
  if (ports.blocked || !ports.installed || !ports.doubleTap) {
    ports.taps.reset(frame.kind === 'modifiers' || frame.kind === 'ready' ? frame.mask : undefined);
    return;
  }

  ports.taps.accept(frame);
}
