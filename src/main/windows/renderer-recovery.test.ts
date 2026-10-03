import { expect, it, vi } from 'vitest';

import { WindowRegistry } from '../ipc/window-registry';
import { testSettings } from '../settings/settings-test-fixture';
import { installLastWindowPolicy } from './last-window-policy';
import { WindowLifecycle } from './window-lifecycle';
import { answerDialog, ControlledWindow, desktopBoundary, notices } from './window-test-fixture';

vi.mock('electron', async () => (await import('./window-test-fixture')).desktopBoundary);
vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', 'https://promptly.invalid/');
vi.stubGlobal('MAIN_WINDOW_VITE_NAME', 'main_window');

it('keeps an unresponsive renderer until a deliberate decision and reopens saved data after a crash', async () => {
  const preferences = testSettings();

  preferences.store.invoke('updateSettings', { onboardingComplete: true });
  preferences.store.invoke('createSnippet', { text: 'Retained owned library text' });
  await preferences.service.initialize();
  const lifecycle = new WindowLifecycle(
    new WindowRegistry(),
    preferences.service,
    {
      trayAvailable: () => false,
      shortcutAvailable: () => false
    },
    () => undefined
  );
  let window = await lifecycle.show();
  const removePolicy = installLastWindowPolicy(() => false);
  const retire = () => {
    lifecycle.stopCommands();
  };

  desktopBoundary.app.on('before-quit', retire);

  try {
    const settings = await lifecycle.show('settings');

    window.minimize();
    expect(() => {
      settings.close();
    }).not.toThrow();
    expect(settings.isDestroyed()).toBe(true);
    await Promise.resolve();
    expect(window.isMinimized()).toBe(false);
    expect(window.isVisible()).toBe(true);
    expect(window.isFocused()).toBe(true);
    const stalledSettings = await lifecycle.show('settings');

    stalledSettings.emit('unresponsive');
    const settingsDecision = notices.at(-1);
    const recoveringSettings = lifecycle.show('settings');

    expect(() => {
      stalledSettings.close();
    }).not.toThrow();
    expect(settingsDecision?.signal?.aborted).toBe(true);
    answerDialog(1);
    await expect(recoveringSettings).rejects.toThrow('Window closed during renderer recovery.');
    expect(await lifecycle.show()).toBe(window);
    const returningSettings = await lifecycle.show('settings');

    expect(await lifecycle.services.returnToMainWindow({})).toMatchObject({
      ok: true,
      value: { kind: 'main', visible: true }
    });
    expect(returningSettings.isDestroyed()).toBe(true);
    expect(desktopBoundary.app.quitting).toBe(false);
    window.emit('unresponsive');
    expect(notices.at(-1)?.message).toBe('This Promptly window is not responding.');
    expect(notices.at(-1)?.detail).toContain('Reloading will discard unsaved edits.');
    const waiting = lifecycle.show();

    answerDialog(0);
    expect(await waiting).toBe(window);
    expect(window.isDestroyed()).toBe(false);
    window.emit('unresponsive');
    const responsive = lifecycle.show();

    window.emit('responsive');
    expect(await responsive).toBe(window);
    window.webContents.emit('render-process-gone', {}, { reason: 'crashed' });
    expect(notices.at(-1)?.message).toBe('This Promptly window stopped.');
    const reopening = lifecycle.show();

    answerDialog(0);
    const old = window;

    window = await reopening;
    expect(desktopBoundary.app.quitting).toBe(false);
    expect(window).not.toBe(old);
    expect(old.isDestroyed()).toBe(true);
    expect(window.isVisible()).toBe(true);
    expect(window.isFocused()).toBe(true);
    window.emit('unresponsive');
    const lateDecision = lifecycle.show();

    await lifecycle.services.quitApplication({});
    expect(desktopBoundary.app.quitting).toBe(true);
    answerDialog(1);
    await expect(lateDecision).rejects.toThrow('Promptly is shutting down.');
    expect(window.isDestroyed()).toBe(false);
    await lifecycle.close();
    preferences.store.reopen();
    expect(
      preferences.store
        .invoke('searchSnippets', {
          query: '',
          tagIds: [],
          untagged: false,
          sort: 'newest',
          offset: 0,
          limit: 10
        })
        .items.map((item) => item.text)
    ).toEqual(['Retained owned library text']);
  } finally {
    removePolicy();
    desktopBoundary.app.removeListener('before-quit', retire);
    answerDialog(1);
    await lifecycle.close();
    await preferences.service.close();
    preferences.store.dispose();
    for (const owned of ControlledWindow.instances) if (!owned.isDestroyed()) owned.destroy();
  }
});
