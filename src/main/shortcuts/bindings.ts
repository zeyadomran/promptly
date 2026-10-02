import type { Settings } from '../../shared/contracts/settings';
import { acceleratorKey } from '../../shared/shortcuts/accelerator';
import { shortcutConflict } from '../../shared/shortcuts/conflicts';

export { acceleratorKey, shortcutLabel } from '../../shared/shortcuts/accelerator';

export type ShortcutAction = 'capture' | 'open' | 'pin';
export interface Binding {
  accelerator: string;
  key: string;
  action: ShortcutAction;
}
export function bindings(settings: Settings, platform: NodeJS.Platform): Binding[] {
  const conflict = shortcutConflict(settings, platform === 'darwin' ? 'darwin' : 'win32');

  if (conflict !== undefined) throw new Error(conflict);
  const candidates: [ShortcutAction, string | null][] = [
    [
      'capture',
      settings.saveShortcut.kind === 'combination' ? settings.saveShortcut.accelerator : null
    ],
    ['open', settings.openShortcut],
    ['pin', settings.pinShortcut]
  ];
  const entries = candidates.flatMap(([action, accelerator]) =>
    accelerator === null
      ? []
      : [{ action, accelerator, key: acceleratorKey(accelerator, platform) }]
  );

  return entries;
}
