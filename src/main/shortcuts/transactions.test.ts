// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { testSettings } from '../settings/settings-test-fixture';
import { acceleratorKey, bindings, shortcutLabel } from './bindings';
import { shortcutFixture } from './shortcut-test-fixture';

it.each(['win32', 'darwin'] as const)(
  'detects platform aliases and in-app collisions on %s',
  (platform) => {
    const fixture = shortcutFixture(vi.fn, platform);

    expect(acceleratorKey('CmdOrCtrl+Alt+Enter', platform)).toBe(
      acceleratorKey(`${platform === 'darwin' ? 'Command' : 'Ctrl'}+Option+Return`, platform)
    );
    expect(() => bindings({ ...fixture.settings, pinShortcut: 'Ctrl+Alt+F10' }, platform)).toThrow(
      'distinct'
    );
    expect(shortcutLabel('CmdOrCtrl+Alt+S', platform)).toBe(
      platform === 'darwin' ? '⌥⌘S' : 'Alt+Ctrl+S'
    );
  }
);

it('failed OS registration keeps the previous live shortcuts and durable revision', async () => {
  const fixture = shortcutFixture(vi.fn);
  const storage = testSettings({ available: [fixture.shortcuts.controller], unavailable: [] });

  try {
    await storage.service.initialize();
    const initial = await storage.service.services.updateSettings({
      openShortcut: fixture.settings.openShortcut
    });

    if (!initial.ok) throw new Error('Fixture initial binding failed');
    fixture.failures.add('Control+Alt+F9');
    const failure = await storage.service.services.updateSettings({
      openShortcut: 'Control+Alt+F9',
      pinShortcut: 'Control+Alt+F8'
    });

    expect(failure).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(storage.service.current).toEqual(initial.value);
    fixture.registered.get(fixture.settings.openShortcut)?.();
    expect(fixture.commands.open).toHaveBeenCalledOnce();
    expect(fixture.registered.has('Control+Alt+F8')).toBe(false);
  } finally {
    storage.store.dispose();
  }
});

it('SQLite commit rejection restores registered bindings and timing', async () => {
  const fixture = shortcutFixture(vi.fn);
  const storage = testSettings({ available: [fixture.shortcuts.controller], unavailable: [] });

  try {
    await storage.service.initialize();
    const previous = storage.service.current;

    storage.store.engine.context.db.exec(
      "CREATE TRIGGER reject_shortcuts BEFORE UPDATE ON settings BEGIN SELECT RAISE(ABORT, 'fixture rejection'); END;"
    );

    await expect(
      storage.service.services.updateSettings({ openShortcut: 'Control+Alt+F9' })
    ).resolves.toMatchObject({ ok: false });
    expect(storage.service.current).toEqual(previous);
    expect(fixture.registered.has(previous.settings.openShortcut)).toBe(true);
    expect(fixture.registered.has('Control+Alt+F9')).toBe(false);
  } finally {
    storage.store.dispose();
  }
});

it('rollback registration failure quarantines callbacks and subsequent preferences', async () => {
  const fixture = shortcutFixture(vi.fn);
  const storage = testSettings({ available: [fixture.shortcuts.controller], unavailable: [] });

  try {
    await storage.service.initialize();
    const previous = storage.service.current;

    storage.store.engine.context.db.exec(
      "CREATE TRIGGER reject_shortcuts BEFORE UPDATE ON settings BEGIN SELECT RAISE(ABORT, 'fixture rejection'); END;"
    );
    fixture.failures.add(previous.settings.openShortcut);
    expect(
      await storage.service.services.updateSettings({ openShortcut: 'Control+Alt+F9' })
    ).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    fixture.registered.get('Control+Alt+F9')?.();
    expect(fixture.commands.open).not.toHaveBeenCalled();
    expect(fixture.shortcuts.status.quarantined).toBe(true);
    expect(fixture.shortcuts.recoveryAvailable).toBe(false);
    expect(await storage.service.services.updateSettings({ theme: 'dark' })).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });
  } finally {
    storage.store.dispose();
  }
});
