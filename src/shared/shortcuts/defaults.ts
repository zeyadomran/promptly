import { defaultSettings, type Settings } from '../contracts/settings';

export function defaultShortcutSettings(): Pick<
  Settings,
  | 'saveShortcut'
  | 'openShortcut'
  | 'pinShortcut'
  | 'composeShortcut'
  | 'localShortcuts'
  | 'doubleTapWindowMs'
> {
  const {
    saveShortcut,
    openShortcut,
    pinShortcut,
    composeShortcut,
    localShortcuts,
    doubleTapWindowMs
  } = defaultSettings();

  return {
    saveShortcut,
    openShortcut,
    pinShortcut,
    composeShortcut,
    localShortcuts,
    doubleTapWindowMs
  };
}
