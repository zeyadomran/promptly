import assert from 'node:assert/strict';

import { testSettings } from './settings-test-fixture';

export async function assertComposeMigration(): Promise<void> {
  const fixture = testSettings();

  try {
    fixture.store.engine.context.db.exec(
      "DELETE FROM settings WHERE key IN ('composeShortcut','composeDestination','promptVariables')"
    );
    fixture.store.engine.context.db
      .prepare('UPDATE settings SET value=? WHERE key=?')
      .run('"Alt+Shift+N"', 'openShortcut');
    const legacy = { tag: 'Control+N', delete: 'Control+B', next: 'Control+1' };

    fixture.store.engine.context.db
      .prepare('UPDATE settings SET value=? WHERE key=?')
      .run(JSON.stringify(legacy), 'localShortcuts');
    await fixture.service.initialize();
    assert.partialDeepStrictEqual(await fixture.service.services.getSettings({}), {
      ok: true,
      value: {
        settings: {
          openShortcut: 'Alt+Shift+N',
          composeShortcut: null,
          composeDestination: 'queue',
          promptVariables: true,
          localShortcuts: {
            tag: 'Control+N',
            delete: 'Control+B',
            next: 'Control+1',
            newSnippet: null,
            bundle: null,
            showLibrary: null,
            showQueue: 'CommandOrControl+2',
            queueComplete: 'CommandOrControl+D'
          }
        }
      }
    });
    assert.partialDeepStrictEqual(
      await fixture.service.services.updateSettings({ theme: 'dark' }),
      { ok: true }
    );
    fixture.store.reopen();
    assert.equal(fixture.store.invoke('getSettings', {}).settings.composeShortcut, null);
    assert.partialDeepStrictEqual(fixture.store.invoke('getSettings', {}).settings.localShortcuts, {
      tag: 'Control+N',
      delete: 'Control+B',
      next: 'Control+1',
      newSnippet: null,
      bundle: null,
      showLibrary: null
    });
  } finally {
    await fixture.service.close();
    fixture.store.dispose();
  }
}
