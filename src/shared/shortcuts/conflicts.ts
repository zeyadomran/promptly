import type { Settings } from '../contracts/settings';
import { acceleratorKey, reservedShortcut, type ShortcutPlatform } from './accelerator';
import { localShortcutIdentities } from './local';

export function shortcutConflict(
  settings: Settings,
  platform: ShortcutPlatform,
  scope: 'all' | 'global' = 'all'
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

  if (scope === 'global') return undefined;
  const local = settings.localShortcuts;

  for (const [action, accelerator] of Object.entries(local)) {
    if (accelerator === null) continue;
    const reserved = reservedShortcut(accelerator, platform);

    if (reserved !== undefined) return reserved;
    for (const identity of localShortcutIdentities(accelerator)) {
      const previous = used.get(identity);

      // Dismissal and editor cancellation have mutually exclusive owners.
      if (action === 'cancelEdit' && previous === localShortcutLabels.dismiss) continue;
      if (previous !== undefined)
        return `${localShortcutLabels[action as keyof typeof local]} already uses the same shortcut as ${previous}.`;
      used.set(identity, localShortcutLabels[action as keyof typeof local]);
    }
  }

  return undefined;
}

export const localShortcutLabels = {
  next: 'Next snippet',
  previous: 'Previous snippet',
  copy: 'Copy snippet',
  delete: 'Delete snippet',
  deleteAlternate: 'Delete snippet (alternative)',
  focusSearch: 'Focus search',
  tag: 'Edit snippet tags',
  settings: 'Open Settings',
  dismiss: 'Clear search or hide window',
  cancelEdit: 'Cancel text edit'
};
