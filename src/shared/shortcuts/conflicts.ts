import type { Settings } from '../contracts/settings';
import { acceleratorKey, reservedShortcut, type ShortcutPlatform } from './accelerator';
import { globalBindingAllowed } from './global-binding';
import { localShortcutIdentities } from './local';

interface Conflict {
  identity: string;
  message: string;
}
interface Candidate {
  action: string;
  label: string;
  identities: string[];
}

function conflicts(
  settings: Settings,
  platform: ShortcutPlatform,
  scope: 'all' | 'global'
): Conflict[] {
  const globals: [string, string, string | null][] = [
    [
      'save',
      'Save selection',
      settings.saveShortcut.kind === 'combination' ? settings.saveShortcut.accelerator : null
    ],
    ['open', 'Open Promptly', settings.openShortcut],
    ['pin', 'Toggle always on top', settings.pinShortcut]
  ];
  const candidates: Candidate[] = globals.flatMap(([action, label, accelerator]) =>
    accelerator === null || !globalBindingAllowed(accelerator)
      ? []
      : [{ action, label, identities: [acceleratorKey(accelerator, platform)] }]
  );

  if (scope === 'all') {
    for (const action of Object.keys(localShortcutLabels) as (keyof typeof localShortcutLabels)[]) {
      const accelerator = settings.localShortcuts[action];

      if (accelerator !== null)
        candidates.push({
          action,
          label: localShortcutLabels[action],
          identities: localShortcutIdentities(accelerator)
        });
    }
  }

  const found: Conflict[] = [];
  const used = new Map<string, Candidate[]>();

  for (const candidate of candidates) {
    for (const identity of new Set(candidate.identities)) {
      const reservation = reservedShortcut(identity.replace(/^\+/, ''), platform);

      if (reservation !== undefined)
        found.push({ identity: `reserved:${candidate.action}:${identity}`, message: reservation });
      for (const previous of used.get(identity) ?? []) {
        if (candidate.action === 'cancelEdit' && previous.action === 'dismiss') continue;
        found.push({
          identity: `${identity}:${previous.action}:${candidate.action}`,
          message: `${candidate.label} already uses the same shortcut as ${previous.label}.`
        });
      }

      used.set(identity, [...(used.get(identity) ?? []), candidate]);
    }
  }

  return found;
}

export function shortcutConflict(
  settings: Settings,
  platform: ShortcutPlatform,
  scope: 'all' | 'global' = 'all'
): string | undefined {
  return conflicts(settings, platform, scope)[0]?.message;
}

/** Older profiles can remove collisions incrementally; no changed binding may introduce one. */
export function shortcutChangeConflict(
  previous: Settings,
  candidate: Settings,
  platform: ShortcutPlatform
): string | undefined {
  const retained = new Set(
    conflicts(previous, platform, 'all').map((conflict) => conflict.identity)
  );

  return conflicts(candidate, platform, 'all').find((conflict) => !retained.has(conflict.identity))
    ?.message;
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
