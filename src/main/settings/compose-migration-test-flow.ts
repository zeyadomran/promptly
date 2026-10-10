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
    await fixture.service.initialize();
    assert.partialDeepStrictEqual(await fixture.service.services.getSettings({}), {
      ok: true,
      value: {
        settings: {
          openShortcut: 'Alt+Shift+N',
          composeShortcut: null,
          composeDestination: 'queue',
          promptVariables: true
        }
      }
    });
    assert.partialDeepStrictEqual(
      await fixture.service.services.updateSettings({ theme: 'dark' }),
      { ok: true }
    );
    fixture.store.reopen();
    assert.equal(fixture.store.invoke('getSettings', {}).settings.composeShortcut, null);
  } finally {
    await fixture.service.close();
    fixture.store.dispose();
  }
}
