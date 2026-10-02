import type { Settings } from '../../../shared/contracts/settings';

export function saveShortcutLabel(shortcut: Settings['saveShortcut']): string {
  if (shortcut.kind === 'combination') return shortcut.accelerator;
  const names = { shift: 'Shift', control: 'Control', alt: 'Alt', meta: 'Command / Windows' };

  return `double-tap ${names[shortcut.modifier]}`;
}
