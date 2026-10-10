import type { Settings } from '../../shared/contracts/settings';
import type { KeyboardHook } from '../platform/keyboard/keyboard-hook';
import type { SettingsController } from '../settings/controllers';
import type { Accelerators } from './accelerators';
import { bindings } from './bindings';
import type { DoubleTap } from './double-tap';

interface ControllerDependencies {
  previous: () => Settings | undefined;
  commit: (settings: Settings) => void;
  hook: () => KeyboardHook | undefined;
  recording: () => boolean;
  accelerators: Accelerators;
  taps: DoubleTap;
  platform: NodeJS.Platform;
  recover: () => void;
}

export function shortcutController(dependencies: ControllerDependencies): SettingsController {
  const { accelerators, taps, platform } = dependencies;

  return {
    name: 'global shortcuts',
    keys: ['saveShortcut', 'openShortcut', 'pinShortcut', 'composeShortcut', 'doubleTapWindowMs'],
    apply: async (settings) => {
      const previous = dependencies.previous();
      const initial = previous === undefined;

      if (initial) await dependencies.hook()?.start();
      const candidates = bindings(settings, platform);
      const old = previous === undefined ? [] : bindings(previous, platform);
      const changed =
        JSON.stringify(candidates) !== JSON.stringify(old) ||
        JSON.stringify(settings.saveShortcut) !== JSON.stringify(previous?.saveShortcut);

      if (changed && dependencies.recording())
        throw new Error('Finish recording before changing shortcut bindings.');
      if (
        !initial &&
        settings.saveShortcut.kind === 'double-tap' &&
        JSON.stringify(settings.saveShortcut) !== JSON.stringify(previous.saveShortcut) &&
        dependencies.hook()?.health.installed !== true
      )
        throw new Error('The modifier listener is unavailable.');
      accelerators.replace(
        candidates.filter(
          (binding) =>
            initial ||
            accelerators.registered(binding.action) ||
            !old.some((entry) => entry.key === binding.key && entry.action === binding.action)
        ),
        initial
      );
      dependencies.commit(structuredClone(settings));
      taps.configure(
        settings.saveShortcut.kind === 'double-tap' ? settings.saveShortcut.modifier : 'shift',
        settings.doubleTapWindowMs
      );
    },
    quarantine: () => {
      accelerators.quarantine();
      taps.reset();
      dependencies.recover();
    }
  };
}
