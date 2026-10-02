import { expect, it, vi } from 'vitest';

import { closeSettingsStorage } from '../lifecycle/close-settings-storage';
import { trayFixture } from './tray-test-fixture';

it('keeps recent commands authoritative and capture-only pause reachable through reversible tray visibility', async () => {
  const owned = trayFixture();
  const { fixture, controllers, keyboard, mutations, clipboard, windows, copy, tray } = owned;

  try {
    fixture.store.invoke('updateSettings', { pinShortcut: 'Control+Alt+P' });
    controllers.push(keyboard.shortcuts.controller, tray.controller);
    for (const text of ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'])
      fixture.store.invoke('createSnippet', { text });
    await fixture.service.initialize();
    expect(tray.available).toBe(true);
    expect(
      owned
        .menu()
        .map((item) => item.label)
        .filter(Boolean)
    ).toEqual([
      'Open Promptly',
      'seventh',
      'sixth',
      'fifth',
      'fourth',
      'third',
      'Pause capture',
      'Settings',
      'Quit'
    ]);
    const recent = owned.menu().find((item) => item.label === 'seventh');
    const id = fixture.store.invoke('searchSnippets', {
      query: 'seventh',
      tagIds: [],
      untagged: false,
      sort: 'newest',
      offset: 0,
      limit: 1
    }).items[0]?.id;

    if (id === undefined || recent?.run === undefined) throw new Error('Expected recent command.');
    const full = 'edited full '.repeat(8) + '\n你好😀';

    fixture.store.invoke('updateSnippet', { id, text: full });
    await recent.run();
    expect(clipboard).toEqual([full]);
    expect(windows).not.toContain('unexpected hide');
    await tray.refresh();
    expect(owned.menu()[2]?.label).toBe('edited full edited full edited full edited full ed…');
    fixture.store.invoke('deleteSnippet', { id });
    await recent.run();
    expect(clipboard).toEqual([full]);
    expect(windows).toContain('error');
    await tray.refresh();
    expect(owned.menu().map((item) => item.label)).toContain('second');
    await owned
      .menu()
      .find((item) => item.label === 'Pause capture')
      ?.run?.();
    expect(owned.pausedIcon()).toBe(true);
    expect(keyboard.shortcuts.status.capturePaused).toBe(true);
    keyboard.tap(0);
    keyboard.tap(100);
    expect(owned.captured()).toBe(0);
    keyboard.registered.get('Alt+Space')?.();
    keyboard.registered.get('Control+Alt+P')?.();
    expect(windows).toEqual(['error', 'shortcut open', 'shortcut pin']);
    await owned
      .menu()
      .find((item) => item.label === 'Resume capture')
      ?.run?.();
    keyboard.tap(1000);
    keyboard.tap(1100);
    expect(owned.captured()).toBe(1);
    expect(owned.pausedIcon()).toBe(false);
    await owned
      .menu()
      .find((item) => item.label === 'Open Promptly')
      ?.run?.();
    await owned
      .menu()
      .find((item) => item.label === 'Settings')
      ?.run?.();
    expect(windows.slice(-2)).toEqual(['main', 'settings']);
    fixture.store.invoke('clearLibrary', {});
    await tray.refresh();
    expect(
      owned
        .menu()
        .map((item) => item.label)
        .filter(Boolean)
    ).toEqual(['Open Promptly', 'Pause capture', 'Settings', 'Quit']);
    expect(await fixture.service.services.updateSettings({ showInTray: false })).toMatchObject({
      ok: true
    });
    expect(tray.available).toBe(false);
    expect(windows.at(-1)).toBe('recovered');
    owned.deny(true);
    expect(await fixture.service.services.updateSettings({ showInTray: true })).toMatchObject({
      ok: false
    });
    expect(fixture.service.current.settings.showInTray).toBe(false);
    expect(tray.available).toBe(false);
    owned.deny(false);
    expect(await fixture.service.services.updateSettings({ showInTray: true })).toMatchObject({
      ok: true
    });
    const read = owned.holdRead();
    const refreshing = tray.refresh();

    await read.entered;
    await fixture.service.services.updateSettings({ showInTray: false });
    const showing = fixture.service.services.updateSettings({ showInTray: true });

    // Re-enable while the old native generation's worker response is still held.
    await vi.waitFor(() => {
      expect(tray.available).toBe(true);
    });
    read.release();
    await Promise.all([refreshing, showing]);
    expect(owned.menu().map((item) => item.label)).toContain('Open Promptly');
    const quit = owned.menu().find((item) => item.label === 'Quit');

    await quit?.run?.();
    expect(windows.at(-1)).toBe('quit');
    const settingsRead = owned.holdSettingsRead();
    const accepted = fixture.service.services.updateSettings({ showInTray: false });

    await settingsRead.entered;
    tray.stopCommands();
    const draining = closeSettingsStorage(fixture.service, undefined, undefined, tray);
    const beforeRetired = windows.length;

    await quit?.run?.();
    expect(windows.length).toBe(beforeRetired);
    settingsRead.release();
    expect(await accepted).toMatchObject({ ok: true });
    await draining;
    expect(windows.length).toBe(beforeRetired);
    expect(fixture.service.current.settings.showInTray).toBe(false);
    expect(fixture.store.invoke('getSettings', {}).settings.showInTray).toBe(false);
    expect(tray.available).toBe(false);
  } finally {
    await tray.close();
    await copy.close();
    await fixture.service.close();
    await keyboard.shortcuts.close();
    await mutations.close();
    fixture.store.dispose();
  }
});
