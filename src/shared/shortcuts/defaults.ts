import { defaultSettings, type Settings } from '../contracts/settings';

export function defaultShortcutSettings(): Pick<
  Settings,
  'saveShortcut' | 'openShortcut' | 'pinShortcut' | 'localShortcuts' | 'doubleTapWindowMs'
> {
  const { saveShortcut, openShortcut, pinShortcut, localShortcuts, doubleTapWindowMs } =
    defaultSettings();

  return { saveShortcut, openShortcut, pinShortcut, localShortcuts, doubleTapWindowMs };
}
