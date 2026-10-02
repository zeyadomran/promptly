// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Settings } from '../../shared/contracts/settings';
import { testSettings } from './settings-test-fixture';

describe('serialized reversible settings effects', () => {
  let fixture: ReturnType<typeof testSettings> | undefined;

  afterEach(() => {
    fixture?.store.dispose();
  });

  it('rolls back every applied and partially failing controller and retains durable revision', async () => {
    let theme = 'system';
    let pinned = false;

    fixture = testSettings({
      unavailable: [],
      available: [
        {
          keys: ['theme'],
          name: 'theme',
          apply: (settings) => {
            theme = settings.theme;
            return Promise.resolve();
          }
        },
        {
          keys: ['alwaysOnTop'],
          name: 'pin',
          apply: (settings) => {
            pinned = settings.alwaysOnTop;
            if (pinned) throw new Error('Native failure');
            return Promise.resolve();
          }
        }
      ]
    });
    await fixture.service.initialize();
    const failed = await fixture.service.services.updateSettings({
      theme: 'dark',
      alwaysOnTop: true
    });

    expect(failed).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    if (!failed.ok) expect(failed.error.message).toContain('pin');
    expect({ theme, pinned }).toEqual({ theme: 'system', pinned: false });
    expect(fixture.store.invoke('getSettings', {}).revision).toBe(0);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {}).settings.theme).toBe('system');
  });

  it('rolls native changes back when SQLite rejects the commit, then allows a successful retry', async () => {
    let theme = 'system';

    fixture = testSettings({
      unavailable: [],
      available: [
        {
          keys: ['theme'],
          name: 'theme',
          apply: (settings) => {
            theme = settings.theme;
            return Promise.resolve();
          }
        }
      ]
    });
    await fixture.service.initialize();
    fixture.store.engine.context.db.exec(
      "CREATE TRIGGER reject_settings BEFORE UPDATE ON settings BEGIN SELECT RAISE(ABORT, 'locked settings'); END;"
    );
    expect(await fixture.service.services.updateSettings({ theme: 'dark' })).toMatchObject({
      ok: false
    });
    expect(theme).toBe('system');
    expect(fixture.store.invoke('getSettings', {}).revision).toBe(0);
    fixture.store.engine.context.db.exec('DROP TRIGGER reject_settings');
    expect(await fixture.service.services.updateSettings({ theme: 'light' })).toMatchObject({
      ok: true,
      value: { revision: 1 }
    });
    expect(theme).toBe('light');
  });

  it('serializes conflicting updates, drains accepted side effects before shutdown, and rejects new work', async () => {
    let release: (() => void) | undefined;
    const apply = vi.fn((settings: Settings) =>
      settings.theme === 'dark'
        ? new Promise<void>((resolve) => {
            release = resolve;
          })
        : Promise.resolve()
    );

    fixture = testSettings({
      unavailable: [],
      available: [{ keys: ['theme'], name: 'theme', apply }]
    });
    await fixture.service.initialize();
    const first = fixture.service.services.updateSettings({ theme: 'dark' });
    const second = fixture.service.services.updateSettings({
      theme: 'light',
      doubleTapWindowMs: 150
    });

    await vi.waitFor(() => {
      expect(release).toBeDefined();
    });
    const settled = vi.fn();
    const close = fixture.service.close().then(settled);

    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    expect(await fixture.service.services.updateSettings({ theme: 'system' })).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });
    release?.();
    expect(await first).toMatchObject({
      ok: true,
      value: { revision: 1, settings: { theme: 'dark' } }
    });
    expect(await second).toMatchObject({
      ok: true,
      value: { revision: 2, settings: { theme: 'light', doubleTapWindowMs: 150 } }
    });
    await close;
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {}).settings.theme).toBe('light');
  });

  it('does not claim absent native services succeeded, while pure timing/preferences persist', async () => {
    fixture = testSettings({ available: [], unavailable: ['showInTray', 'openShortcut'] });
    await fixture.service.initialize();
    expect(
      await fixture.service.services.updateSettings({ showInTray: false, theme: 'dark' })
    ).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    expect(fixture.store.invoke('getSettings', {}).revision).toBe(0);
    expect(
      await fixture.service.services.updateSettings({
        doubleTapWindowMs: 600,
        normalizeWhitespace: false,
        showConfirmationToast: false
      })
    ).toMatchObject({ ok: true });
    expect(fixture.service.current.settings.doubleTapWindowMs).toBe(600);
  });

  it('settles remaining rollback effects after synchronous failure and blocks further native mutations', async () => {
    let failRollback = false;
    let theme = 'system';

    fixture = testSettings({
      unavailable: [],
      available: [
        {
          keys: ['theme'],
          name: 'theme',
          apply: (settings) => {
            theme = settings.theme;
            return Promise.resolve();
          }
        },
        {
          keys: ['alwaysOnTop'],
          name: 'pin',
          apply: () => {
            if (failRollback) throw new Error('Native apply/rollback failed');
            return Promise.resolve();
          }
        }
      ]
    });
    await fixture.service.initialize();
    failRollback = true;
    expect(
      await fixture.service.services.updateSettings({ theme: 'dark', alwaysOnTop: true })
    ).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    expect(theme).toBe('system');
    expect(fixture.store.invoke('getSettings', {}).revision).toBe(0);
    expect(await fixture.service.services.updateSettings({ theme: 'light' })).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });
  });
});
