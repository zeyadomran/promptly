export type ShortcutPlatform = 'darwin' | 'win32' | 'unsupported';

const aliases = new Map([
  ['cmd', 'command'],
  ['ctrl', 'control'],
  ['option', 'alt'],
  ['meta', 'super'],
  ['esc', 'escape'],
  ['enter', 'return']
]);

export function acceleratorKey(accelerator: string, platform: string): string {
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

export function shortcutKeycaps(accelerator: string, platform: ShortcutPlatform): string[] {
  const symbols: Record<string, string> =
    platform === 'darwin'
      ? { command: '⌘', control: '⌃', alt: '⌥', shift: '⇧', super: '⌘' }
      : { command: 'Win', control: 'Ctrl', alt: 'Alt', shift: 'Shift', super: 'Win' };

  return acceleratorKey(accelerator, platform)
    .split('+')
    .map((part) => symbols[part] ?? (part === 'space' ? 'Space' : part.toUpperCase()));
}

export function shortcutLabel(accelerator: string, platform: string): string {
  return shortcutKeycaps(accelerator, platform === 'darwin' ? 'darwin' : 'win32').join(
    platform === 'darwin' ? '' : '+'
  );
}

/** Known OS reservations only; registration is still the authority for other bindings. */
export function reservedShortcut(
  accelerator: string,
  platform: ShortcutPlatform
): string | undefined {
  const key = acceleratorKey(accelerator, platform);

  if (platform === 'win32' && key === 'super+l') return 'Win+L is reserved for locking Windows.';
  if (platform === 'win32' && key === 'alt+control+delete')
    return 'Ctrl+Alt+Delete is reserved by Windows.';
  return undefined;
}
