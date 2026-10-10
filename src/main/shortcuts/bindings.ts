import type { Settings } from '../../shared/contracts/settings';
import { acceleratorKey, windowsAccelerator } from '../../shared/shortcuts/accelerator';
import { shortcutConflict } from '../../shared/shortcuts/conflicts';
import { globalBindingAllowed } from '../../shared/shortcuts/global-binding';

export { acceleratorKey, shortcutLabel } from '../../shared/shortcuts/accelerator';

export type ShortcutAction = 'capture' | 'open' | 'pin' | 'compose';
export interface Binding {
  accelerator: string;
  key: string;
  action: ShortcutAction;
}
export function bindings(settings: Settings, platform: NodeJS.Platform): Binding[] {
  const conflict = shortcutConflict(settings, 'win32', 'global');

  if (conflict !== undefined) throw new Error(conflict);
  const candidates: [ShortcutAction, string | null][] = [
    [
      'capture',
      settings.saveShortcut.kind === 'combination' ? settings.saveShortcut.accelerator : null
    ],
    ['open', settings.openShortcut],
    ['compose', settings.composeShortcut],
    ['pin', settings.pinShortcut]
  ];
  const entries = candidates.flatMap(([action, accelerator]) =>
    accelerator === null || !globalBindingAllowed(accelerator)
      ? []
      : [
          {
            action,
            accelerator: windowsAccelerator(accelerator),
            key: acceleratorKey(accelerator, platform)
          }
        ]
  );

  return entries;
}
