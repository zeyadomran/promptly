import type { LocalShortcuts } from '../contracts/local-shortcuts';
import {
  type Settings,
  type SettingsPatch,
  settingsPatchSchema,
  settingsSchema
} from '../contracts/settings';
import { localShortcutLabels, shortcutChangeConflictDetails } from './conflicts';

export type ShortcutTarget = 'save' | 'open' | 'pin' | keyof LocalShortcuts;
export interface ShortcutCollision {
  action: ShortcutTarget;
  label: string;
  swapAllowed: boolean;
  reason?: string;
}
export type ShortcutEdit =
  | { kind: 'ready'; patch: SettingsPatch }
  | { kind: 'invalid'; message: string }
  | { kind: 'conflict'; collision: ShortcutCollision; swapPatch?: SettingsPatch };

export function shortcutBinding(settings: Settings, target: ShortcutTarget): string | null {
  if (target === 'save')
    return settings.saveShortcut.kind === 'combination' ? settings.saveShortcut.accelerator : null;
  if (target === 'open') return settings.openShortcut;
  if (target === 'pin') return settings.pinShortcut;
  return settings.localShortcuts[target];
}

export function shortcutPatch(
  settings: Settings,
  target: ShortcutTarget,
  binding: string | null
): SettingsPatch {
  if (target === 'save')
    return { saveShortcut: { kind: 'combination', accelerator: binding ?? '' } };
  if (target === 'open') return { openShortcut: binding ?? '' };
  if (target === 'pin') return { pinShortcut: binding };
  return { localShortcuts: { ...settings.localShortcuts, [target]: binding } };
}

export function planShortcutEdit(
  settings: Settings,
  target: ShortcutTarget,
  binding: string | null
): ShortcutEdit {
  const patch = shortcutPatch(settings, target, binding);
  const parsed = settingsPatchSchema.safeParse(patch);

  if (!parsed.success)
    return { kind: 'invalid', message: parsed.error.issues[0]?.message ?? 'Use a valid shortcut.' };
  const next = settingsSchema.parse({ ...settings, ...parsed.data });
  const conflict = shortcutChangeConflictDetails(settings, next, 'win32');

  if (conflict === undefined) return { kind: 'ready', patch: parsed.data };
  const other = conflict.actions.find((action) => action !== target);

  if (other === undefined) return { kind: 'invalid', message: conflict.message };
  const label =
    other === 'save'
      ? 'Capture selection'
      : other === 'open'
        ? 'Open Promptly'
        : other === 'pin'
          ? 'Toggle always on top'
          : localShortcutLabels[other];
  const previous = shortcutBinding(settings, target);
  const exchange = { ...patch, ...shortcutPatch(next, other, previous) };
  const swap = settingsPatchSchema.safeParse(exchange);
  const swapAllowed =
    (target !== 'save' || previous !== null) &&
    swap.success &&
    shortcutChangeConflictDetails(
      settings,
      settingsSchema.parse({ ...settings, ...swap.data }),
      'win32'
    ) === undefined;

  return {
    kind: 'conflict',
    collision: {
      action: other,
      label,
      swapAllowed,
      ...(!swapAllowed
        ? { reason: 'These bindings cannot be exchanged safely. Choose another shortcut.' }
        : {})
    },
    ...(swapAllowed ? { swapPatch: swap.data } : {})
  };
}
