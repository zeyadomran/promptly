// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  defaultSettings,
  settingsPatchSchema,
  shouldHideAfterCopy
} from '../../shared/contracts/settings';
import { StorageEngine } from '../storage/engine';
import { testStorage } from '../storage/storage-test-fixture';

describe('durable settings', () => {
  let store: ReturnType<typeof testStorage>;

  beforeEach(() => {
    store = testStorage();
  });
  afterEach(() => {
    store.dispose();
  });

  it('persists defaults and complete preferences without changing startup mode when saving geometry', () => {
    expect(store.invoke('getSettings', {})).toEqual({ revision: 0, settings: defaultSettings() });
    expect(
      store.engine.context.db.prepare('SELECT COUNT(*) AS count FROM settings').get()?.['count']
    ).toBe(Object.keys(defaultSettings()).length);
    const bounds = { x: -440, y: 100, width: 440, height: 600 };
    const updated = store.invoke('updateSettings', {
      theme: 'dark',
      alwaysOnTop: true,
      normalizeWhitespace: false,
      showConfirmationToast: false,
      launchAtLogin: true,
      showDockIcon: false,
      showInTray: false,
      onboardingComplete: true,
      doubleTapWindowMs: 600,
      openShortcut: 'Control+Space',
      pinShortcut: 'Control+P',
      saveShortcut: { kind: 'combination', accelerator: 'Control+Shift+S' },
      hideAfterCopy: 'never',
      rememberedBounds: { compact: bounds, regular: { ...bounds, width: 900 } }
    });

    expect(updated.settings.defaultSizeMode).toBe('compact');
    store.reopen();
    expect(store.invoke('getSettings', {})).toEqual(updated);
    expect(store.engine.run(1, 'updateSettings', { defaultSizeMode: 'regular' }).change).toEqual({
      revision: 2,
      domains: ['settings']
    });
    expect(store.invoke('getSettings', {}).settings.rememberedBounds.compact).toEqual(bounds);
  });

  it('rejects empty, unknown, undefined, malformed bounds and timing without a commit', () => {
    for (const invalid of [
      {},
      { theme: 'blue' },
      { theme: undefined },
      { execute: 'shell' },
      { doubleTapWindowMs: 149 },
      { doubleTapWindowMs: 601 },
      { doubleTapWindowMs: 300.5 },
      { rememberedBounds: { compact: { width: -1 }, regular: null } }
    ]) {
      expect(settingsPatchSchema.safeParse(invalid).success).toBe(false);
      expect(store.engine.run(1, 'updateSettings', invalid).result).toMatchObject({
        ok: false,
        error: { code: 'INVALID_REQUEST' }
      });
    }

    expect(store.invoke('getSettings', {}).revision).toBe(0);
    expect(settingsPatchSchema.safeParse({ doubleTapWindowMs: 150 }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ doubleTapWindowMs: 600 }).success).toBe(true);
  });

  it('migrates legacy boolean overrides and missing keys while preserving explicit preferences and revision', () => {
    store.engine.context.db.exec(
      "ALTER TABLE snippets DROP COLUMN textUtf16; DELETE FROM settings; PRAGMA user_version = 1; INSERT INTO settings VALUES ('hideAfterCopy', 'false'); INSERT INTO settings VALUES ('theme', '\"dark\"'); UPDATE metadata SET revision = 27;"
    );
    store.reopen();
    expect(store.invoke('getSettings', {})).toEqual({
      revision: 27,
      settings: { ...defaultSettings(), hideAfterCopy: 'never', theme: 'dark' }
    });
    expect(store.engine.context.db.prepare('PRAGMA user_version').get()?.['user_version']).toBe(3);
    store.reopen();
    expect(store.invoke('getSettings', {}).settings.hideAfterCopy).toBe('never');
  });

  it.each(['not-json', '"unknown"'])(
    'fails closed on corrupt preferences (%s) without replacing the stored value',
    (value) => {
      store.engine.context.db
        .prepare("UPDATE settings SET value = ? WHERE key = 'theme'")
        .run(value);
      expect(() => new StorageEngine(store.filename)).toThrow(/Stored preference/);
      const db = new DatabaseSync(store.filename);

      try {
        expect(db.prepare("SELECT value FROM settings WHERE key = 'theme'").get()?.['value']).toBe(
          value
        );
      } finally {
        db.close();
      }
    }
  );

  it('automatic follows pin while explicit hide choices remain stable', () => {
    const defaults = defaultSettings();

    expect(shouldHideAfterCopy(defaults)).toBe(true);
    expect(shouldHideAfterCopy({ ...defaults, alwaysOnTop: true })).toBe(false);
    for (const pinned of [true, false]) {
      expect(
        shouldHideAfterCopy({ ...defaults, alwaysOnTop: pinned, hideAfterCopy: 'always' })
      ).toBe(true);
      expect(
        shouldHideAfterCopy({ ...defaults, alwaysOnTop: pinned, hideAfterCopy: 'never' })
      ).toBe(false);
    }
  });
});
