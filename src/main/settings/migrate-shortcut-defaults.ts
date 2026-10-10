import { optionalLocalShortcutActions } from '../../shared/contracts/local-shortcuts';
import type { Settings } from '../../shared/contracts/settings';
import { shortcutChangeConflict } from '../../shared/shortcuts/conflicts';

/** A newly introduced default must not replace an established legacy binding. */
export function migrateShortcutDefaults(settings: Settings, local: unknown): void {
  const stored = local !== null && typeof local === 'object' && !Array.isArray(local) ? local : {};

  for (const action of optionalLocalShortcutActions) {
    if (Object.hasOwn(stored, action)) continue;
    const previous = {
      ...settings,
      localShortcuts: { ...settings.localShortcuts, [action]: null }
    };

    if (shortcutChangeConflict(previous, settings, 'win32') !== undefined)
      settings.localShortcuts[action] = null;
  }
}
