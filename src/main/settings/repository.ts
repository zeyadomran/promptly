import {
  defaultSettings,
  type SettingsPatch,
  settingsSchema,
  type SettingsSnapshot
} from '../../shared/contracts/settings';
import { shortcutChangeConflict } from '../../shared/shortcuts/conflicts';
import type { StorageContext } from '../storage/context';
import { StorageStartupError } from '../storage/startup-failure';

/** Only the worker owns SQL. Missing keys migrate to defaults; corrupt keys fail closed. */
export class SettingsRepository {
  constructor(private readonly context: StorageContext) {
    this.read();
  }

  read(): SettingsSnapshot {
    const values: Record<string, unknown> = {};
    const defaults = defaultSettings();

    for (const row of this.context.db.prepare('SELECT key, value FROM settings').all()) {
      const key = row['key'];

      if (typeof key !== 'string' || !(key in defaults)) continue;
      try {
        if (typeof row['value'] !== 'string') throw new Error('Invalid JSON');
        values[key] = JSON.parse(row['value']) as unknown;
      } catch {
        throw new StorageStartupError('preferences');
      }
    }

    // Earlier preference rows may have represented the hide override as a boolean.
    if (typeof values['hideAfterCopy'] === 'boolean')
      values['hideAfterCopy'] = values['hideAfterCopy'] ? 'always' : 'never';
    const local = values['localShortcuts'];

    if (local !== null && typeof local === 'object' && !Array.isArray(local))
      values['localShortcuts'] = { ...defaults.localShortcuts, ...local };
    const parsed = settingsSchema.safeParse({ ...defaults, ...values });

    if (!parsed.success) throw new StorageStartupError('preferences');
    if (
      values['composeShortcut'] === undefined &&
      shortcutChangeConflict({ ...parsed.data, composeShortcut: null }, parsed.data, 'win32') !==
        undefined
    )
      parsed.data.composeShortcut = null;
    return { revision: this.context.revision(), settings: parsed.data };
  }

  write(patch: SettingsPatch): SettingsSnapshot {
    const settings = settingsSchema.parse({ ...this.read().settings, ...patch });
    const write = this.context.db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );

    for (const [key, value] of Object.entries(settings)) write.run(key, JSON.stringify(value));
    return { revision: this.context.revision(), settings };
  }
}
