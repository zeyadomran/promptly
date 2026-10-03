import { DatabaseSync } from 'node:sqlite';

import { expect, it, vi } from 'vitest';

import { WindowRegistry } from '../ipc/window-registry';
import { testSettings } from '../settings/settings-test-fixture';
import { shortcutFixture } from '../shortcuts/shortcut-test-fixture';
import { WindowLifecycle } from './window-lifecycle';
import { ControlledWindow } from './window-test-fixture';

vi.mock('electron', async () => (await import('./window-test-fixture')).desktopBoundary);
vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', 'https://promptly.invalid/');
vi.stubGlobal('MAIN_WINDOW_VITE_NAME', 'main_window');

it('keeps recording focus and a reachable window when its external recovery route disappears', async () => {
  const preferences = testSettings();

  preferences.store.invoke('updateSettings', { onboardingComplete: true });
  await preferences.service.initialize();
  const fixture = shortcutFixture(
    (callback) => callback,
    'win32',
    () => {
      lifecycle.recoverIfUnreachable();
    }
  );
  let tray = false;
  const recovery = {
    trayAvailable: () => tray,
    shortcutAvailable: () => fixture.shortcuts.recoveryAvailable
  };

  const lifecycle = new WindowLifecycle(
    new WindowRegistry(),
    preferences.service,
    recovery,
    () => undefined
  );

  await lifecycle.show();
  const window = ControlledWindow.instances.at(-1);

  if (window === undefined) throw new Error('Expected owned window.');
  let opened = Promise.resolve();

  fixture.commands.open = () => {
    opened = lifecycle.toggle();
    return undefined;
  };

  try {
    lifecycle.hide();
    expect(window.isMinimized()).toBe(true);
    await fixture.shortcuts.controller.apply(fixture.settings);
    const open = fixture.registered.get(fixture.settings.openShortcut);

    await lifecycle.show();
    lifecycle.hide();
    expect(window.isVisible()).toBe(false);
    fixture.shortcuts.record(11, true);
    open?.();
    expect(fixture.shortcuts.status.recording).toBe(true);
    expect(fixture.shortcuts.recoveryAvailable).toBe(false);
    expect(window.isVisible()).toBe(false);
    fixture.shortcuts.record(12, true);
    fixture.shortcuts.release(11);
    expect(fixture.shortcuts.status.recording).toBe(true);
    fixture.shortcuts.release(12);
    expect(fixture.shortcuts.status.recording).toBe(false);
    expect(fixture.shortcuts.recoveryAvailable).toBe(true);
    expect(window.isVisible()).toBe(false);
    open?.();
    await opened;
    expect(window.isVisible()).toBe(true);
    window.focused = false;
    open?.();
    await opened;
    expect({ visible: window.isVisible(), focused: window.isFocused() }).toEqual({
      visible: true,
      focused: true
    });
    open?.();
    await opened;
    expect(window.isVisible()).toBe(false);
    fixture.registered.delete(fixture.settings.openShortcut);
    fixture.failures.add(fixture.settings.openShortcut);
    tray = true;
    await fixture.shortcuts.sleep();
    await fixture.shortcuts.resume();
    expect(window.isVisible()).toBe(false);
    tray = false;
    await fixture.shortcuts.sleep();
    await fixture.shortcuts.resume();
    expect(window.isVisible()).toBe(true);
    lifecycle.hide();
    await fixture.shortcuts.sleep();
    await fixture.shortcuts.resume();
    expect(window.isMinimized()).toBe(true);
    const database = new DatabaseSync(preferences.store.filename);

    try {
      database.exec(`CREATE TRIGGER reject_geometry BEFORE UPDATE ON settings
        WHEN NEW.key = 'rememberedBounds' BEGIN SELECT RAISE(ABORT, 'Controlled geometry failure'); END;`);
      expect(await lifecycle.services.setWindowMode({ mode: 'regular' })).toMatchObject({
        ok: false
      });
      database.exec('DROP TRIGGER reject_geometry');
      expect(await lifecycle.services.setWindowMode({ mode: 'regular' })).toMatchObject({
        ok: true,
        value: { mode: 'regular' }
      });
      window.setBounds({ x: 900, y: 200, width: 1000, height: 640 });
      database.exec(`CREATE TRIGGER reject_geometry BEFORE UPDATE ON settings
        WHEN NEW.key = 'rememberedBounds' BEGIN SELECT RAISE(ABORT, 'Controlled geometry failure'); END;`);
      expect(await lifecycle.services.setWindowMode({ mode: 'compact' })).toMatchObject({
        ok: false
      });
      database.exec('DROP TRIGGER reject_geometry');
      const remembered = preferences.service.current.settings.rememberedBounds;

      expect(
        await preferences.service.services.updateSettings({
          rememberedBounds: { ...remembered, regular: { x: 900, y: 200, width: 1000, height: 640 } }
        })
      ).toMatchObject({ ok: true });
      expect(await lifecycle.services.setWindowMode({ mode: 'compact' })).toMatchObject({
        ok: true,
        value: { mode: 'compact' }
      });
      await lifecycle.close();
      preferences.store.reopen();
      expect(preferences.store.invoke('getSettings', {}).settings.rememberedBounds.regular).toEqual(
        { x: 900, y: 200, width: 1000, height: 640 }
      );
    } finally {
      database.close();
    }
  } finally {
    await lifecycle.close().catch(() => undefined);
    await fixture.shortcuts.close();
    await preferences.service.close();
    preferences.store.dispose();
    window.destroy();
  }
});
