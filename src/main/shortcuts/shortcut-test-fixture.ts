import { defaultSettings } from '../../shared/contracts/settings';
import type { HookFrame } from '../../shared/contracts/shortcuts';
import type { KeyboardHook } from '../platform/keyboard/keyboard-hook';
import { Shortcuts } from './service';

export function shortcutFixture(
  spy: <T extends (...arguments_: never[]) => unknown>(callback: T) => T,
  platform: NodeJS.Platform = 'win32',
  onRecovery: () => void = () => undefined
) {
  const registered = new Map<string, () => void>();
  const failures = new Set<string>();
  let suspended = false;
  const api = {
    register: spy((accelerator: string, callback: () => void) => {
      if (failures.has(accelerator) || suspended) return false;
      registered.set(accelerator, callback);
      return true;
    }),
    unregister: spy((accelerator: string) => {
      registered.delete(accelerator);
    }),
    isRegistered: (accelerator: string) => registered.has(accelerator),
    setSuspended: spy((value: boolean) => {
      suspended = value;
    })
  };
  const commands = {
    capture: spy(() => undefined),
    open: spy(() => undefined),
    pin: spy(() => undefined),
    captureAvailable: () => true
  };
  const hook: KeyboardHook = {
    health: { installed: true },
    start: spy(() => Promise.resolve()),
    stop: spy(() => Promise.resolve())
  };
  const recover = spy(onRecovery);
  const shortcuts = new Shortcuts(api, commands, platform, recover);

  shortcuts.attachHook(hook);
  const settings = {
    ...defaultSettings(),
    openShortcut: 'Control+Alt+F10',
    pinShortcut: 'Control+Alt+F11'
  };
  const frame = (value: HookFrame) => {
    shortcuts.receive(value);
  };

  const tap = (timeMs: number) => {
    frame({ kind: 'modifiers', mask: 1, repeat: false, timeMs });
    frame({ kind: 'modifiers', mask: 0, repeat: false, timeMs: timeMs + 20 });
  };

  return { shortcuts, settings, commands, registered, failures, api, hook, recover, tap, frame };
}
