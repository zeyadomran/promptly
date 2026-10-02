import type { Settings } from '../contracts/settings';
import { acceleratorKey, reservedShortcut, type ShortcutPlatform } from './accelerator';

export function shortcutConflict(
  settings: Settings,
  platform: ShortcutPlatform
): string | undefined {
  const candidates: [string, string | null][] = [
    [
      'Save selection',
      settings.saveShortcut.kind === 'combination' ? settings.saveShortcut.accelerator : null
    ],
    ['Open Promptly', settings.openShortcut],
    ['Toggle always on top', settings.pinShortcut]
  ];
  const used = new Map<string, string>();

  for (const [label, accelerator] of candidates) {
    if (accelerator === null) continue;
    const reserved = reservedShortcut(accelerator, platform);

    if (reserved !== undefined) return reserved;
    const identity = acceleratorKey(accelerator, platform);
    const previous = used.get(identity);

    if (previous !== undefined) return `${label} already uses the same shortcut as ${previous}.`;
    used.set(identity, label);
  }

  return undefined;
}
