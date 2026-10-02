// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { testSettings } from './settings-test-fixture';

describe('failed database rollback quarantines native preferences', () => {
  it('attempts rollback once, preserves revision, and cannot silently recover on a hypothetical second attempt', async () => {
    const calls: string[] = [];
    let rejectFirstRollback = false;
    const fixture = testSettings({
      unavailable: [],
      available: [
        {
          name: 'theme',
          keys: ['theme'],
          apply: (settings) => {
            calls.push(settings.theme);
            if (rejectFirstRollback && settings.theme === 'system') {
              rejectFirstRollback = false;
              throw new Error('First rollback failed; a second would succeed');
            }

            return Promise.resolve();
          }
        }
      ]
    });

    try {
      await fixture.service.initialize();
      rejectFirstRollback = true;
      fixture.store.engine.context.db.exec(
        "CREATE TRIGGER reject_settings BEFORE UPDATE ON settings BEGIN SELECT RAISE(ABORT, 'reject commit'); END;"
      );
      const failed = await fixture.service.services.updateSettings({ theme: 'dark' });

      expect(failed).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
      if (!failed.ok) expect(failed.error.message).toContain('Restart Promptly');
      expect(calls).toEqual(['system', 'dark', 'system']);
      expect(fixture.store.invoke('getSettings', {})).toMatchObject({
        revision: 0,
        settings: { theme: 'system' }
      });
      fixture.store.engine.context.db.exec('DROP TRIGGER reject_settings');
      const next = await fixture.service.services.updateSettings({ theme: 'light' });

      expect(next).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
      if (!next.ok) expect(next.error.message).toContain('Restart Promptly');
      expect(calls).toEqual(['system', 'dark', 'system']);
      await fixture.service.close();
      fixture.store.reopen();
      expect(fixture.store.invoke('getSettings', {}).revision).toBe(0);
    } finally {
      fixture.store.dispose();
    }
  });
});
