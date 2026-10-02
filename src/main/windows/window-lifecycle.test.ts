import { EventEmitter } from 'node:events';

import type { BrowserWindow } from 'electron';
import { beforeEach, expect, it, vi } from 'vitest';

import { defaultSettings } from '../../shared/contracts/settings';
import type { WindowKind } from '../../shared/contracts/window';
import type { WindowRegistry } from '../ipc/window-registry';
import type { SettingsService } from '../settings/service';
import { createMainWindow } from './create-main-window';
import { WindowLifecycle } from './window-lifecycle';

vi.mock('electron', () => ({
  screen: { on: vi.fn(), removeListener: vi.fn() },
  app: { quit: vi.fn() }
}));
vi.mock('./create-main-window', () => ({ createMainWindow: vi.fn() }));
vi.mock('./window-bounds', () => ({
  WindowBounds: class {
    mode = 'compact';
    close = () => Promise.resolve();
  }
}));

function ownedWindow() {
  const window = new EventEmitter();
  let visible = true;
  const native = Object.assign(window, {
    webContents: { send: vi.fn() },
    isDestroyed: () => false,
    isMinimized: () => false,
    isVisible: () => visible,
    show: vi.fn(() => {
      visible = true;
    }),
    hide: () => {
      visible = false;
    },
    focus: vi.fn(),
    close: () => {
      window.emit('closed');
    }
  });

  return native;
}

beforeEach(() => {
  vi.clearAllMocks();
});

function fixture() {
  const windows = new Map<WindowKind, ReturnType<typeof ownedWindow>>();

  vi.mocked(createMainWindow).mockImplementation((_registry, _settings, kind = 'main', created) => {
    const window = ownedWindow();

    windows.set(kind, window);
    created?.(window as unknown as BrowserWindow);
    return Promise.resolve(window as unknown as BrowserWindow);
  });
  const errors = vi.fn();
  const lifecycle = new WindowLifecycle(
    {} as WindowRegistry,
    { current: { revision: 0, settings: defaultSettings() } } as unknown as SettingsService,
    {
      trayAvailable: () => false,
      shortcutAvailable: () => false,
      dockAvailable: () => false
    },
    errors
  );

  return { lifecycle, windows, errors };
}

it('native Settings close returns to and focuses an existing hidden main window', async () => {
  const { lifecycle, windows } = fixture();

  await lifecycle.show();
  await lifecycle.show('settings');
  const main = windows.get('main');

  main?.hide();
  main?.focus.mockClear();
  windows.get('settings')?.close();
  await vi.waitFor(() => {
    expect(main?.focus).toHaveBeenCalledOnce();
  });
  expect(main?.isVisible()).toBe(true);
  expect(vi.mocked(createMainWindow)).toHaveBeenCalledTimes(2);
  expect(await lifecycle.services.getWindowRecovery({})).toMatchObject({
    ok: true,
    value: { tray: false, trayController: false, shortcut: false, dock: false, mainReachable: true }
  });
  await lifecycle.close();
});

it('Settings closing during application shutdown does not restore any window', async () => {
  const { lifecycle, windows, errors } = fixture();

  await lifecycle.show();
  await lifecycle.show('settings');
  await lifecycle.close();
  windows.get('main')?.show.mockClear();
  windows.get('settings')?.close();
  await Promise.resolve();
  expect(windows.get('main')?.show).not.toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
});

it('refuses native route removal if the main window cannot actually become reachable', async () => {
  const { lifecycle, windows } = fixture();

  await lifecycle.show();
  const main = windows.get('main');

  main?.hide();
  main?.show.mockImplementation(() => undefined);
  expect(() => {
    lifecycle.recoverVisibility();
  }).toThrow('could not restore');
  await lifecycle.close();
});
