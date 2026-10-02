import type { Settings } from '../../shared/contracts/settings';

export type ShortcutAction = 'capture' | 'open' | 'pin';
export interface Binding {
  accelerator: string;
  key: string;
  action: ShortcutAction;
}
const aliases = new Map([
  ['cmd', 'command'],
  ['ctrl', 'control'],
  ['option', 'alt'],
  ['meta', 'super'],
  ['esc', 'escape'],
  ['enter', 'return']
]);

export function acceleratorKey(accelerator: string, platform: NodeJS.Platform): string {
  const parts = accelerator.toLowerCase().split('+');
  const key = parts.pop() ?? '';
  const modifiers = parts.map((part) => {
    if (part === 'commandorcontrol' || part === 'cmdorctrl')
      return platform === 'darwin' ? 'command' : 'control';
    const value = aliases.get(part) ?? part;

    return platform === 'darwin' && value === 'super'
      ? 'command'
      : platform === 'win32' && value === 'command'
        ? 'super'
        : value;
  });

  return [...new Set(modifiers)].sort().join('+') + '+' + (aliases.get(key) ?? key);
}

export function bindings(settings: Settings, platform: NodeJS.Platform): Binding[] {
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

  if (new Set(entries.map((entry) => entry.key)).size !== entries.length)
    throw new Error('Shortcut bindings must be distinct.');
  return entries;
}

export function shortcutLabel(accelerator: string, platform: NodeJS.Platform): string {
  const symbols: Record<string, string> =
    platform === 'darwin'
      ? { command: '⌘', control: '⌃', alt: '⌥', shift: '⇧', super: '⌘' }
      : { command: 'Win', control: 'Ctrl', alt: 'Alt', shift: 'Shift', super: 'Win' };
  const parts = acceleratorKey(accelerator, platform).split('+');

  return parts
    .map((part) => symbols[part] ?? (part === 'space' ? 'Space' : part.toUpperCase()))
    .join(platform === 'darwin' ? '' : '+');
}
