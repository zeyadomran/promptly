import type { EventEmitter } from 'node:events';

import { afterEach, expect, it, vi } from 'vitest';

import { defaultSettings } from '../../shared/contracts/settings';
import type { WindowRegistry } from '../ipc/window-registry';
import type { SettingsService } from '../settings/service';
import { createMainWindow } from './create-main-window';
import { WindowLifecycle } from './window-lifecycle';

type OwnedWindow = EventEmitter & { webContents: EventEmitter; destroy: () => void };
const owned = await vi.hoisted(async () => ({
  EventEmitter: (await import('node:events')).EventEmitter,
  load: vi.fn<() => Promise<void>>(),
  show: vi.fn(),
  destroy: vi.fn(),
  count: 0,
  window: undefined as OwnedWindow | undefined
}));

vi.mock('electron', () => ({
  BrowserWindow: class extends owned.EventEmitter {
    webContents = Object.assign(new owned.EventEmitter(), {
      setWindowOpenHandler: vi.fn(),
      send: vi.fn()
    });
    dead = false;
    constructor() {
      super();
      owned.window = this;
      owned.count++;
    }
    loadURL = owned.load;
    show = owned.show;
    focus = vi.fn();
    isMinimized = () => false;
    isDestroyed = () => this.dead;
    setVisibleOnAllWorkspaces = vi.fn();
    destroy() {
      owned.destroy();
      this.dead = true;
      this.emit('closed');
      this.webContents.emit('destroyed');
    }
  },
  app: { quit: vi.fn() },
  nativeTheme: { shouldUseDarkColors: false },
  screen: {
    on: vi.fn(),
    removeListener: vi.fn(),
    getPrimaryDisplay: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }),
    getAllDisplays: () => []
  },
  session: {
    fromPartition: () => ({
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn()
    })
  }
}));
vi.mock('./install-renderer-assets', () => ({ installRendererAssets: () => 'owned-nonce' }));
vi.mock('./native-chrome', () => ({ registerNativeChrome: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  owned.count = 0;
});

function registry() {
  vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', 'file:///owned-renderer/index.html');
  vi.stubGlobal('MAIN_WINDOW_VITE_NAME', 'main_window');
  return { register: vi.fn() } as unknown as WindowRegistry;
}

function expectReadyCleanup(window: OwnedWindow | undefined) {
  expect(window?.listenerCount('ready-to-show')).toBe(0);
  expect(window?.webContents.listenerCount('destroyed')).toBe(0);
  expect(window?.webContents.listenerCount('render-process-gone')).toBe(0);
}

it('settles load and ready before showing and never schedules a delayed show after hide', async () => {
  let load: (() => void) | undefined;

  owned.load.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        load = resolve;
      })
  );
  const opening = createMainWindow(registry(), undefined, 'settings');

  load?.();
  await Promise.resolve();
  expect(owned.show).not.toHaveBeenCalled();
  owned.window?.emit('ready-to-show');
  await opening;
  expect(owned.show).toHaveBeenCalledOnce();
  expectReadyCleanup(owned.window);
  expect(owned.window?.listenerCount('closed')).toBe(0);
  owned.show.mockClear();
  owned.window?.emit('ready-to-show');
  await Promise.resolve();
  expect(owned.show).not.toHaveBeenCalled();
});

it.each(['before-ready', 'after-ready'] as const)(
  'load rejection %s destroys the registered window and cleans every readiness listener',
  async (order) => {
    let rejectLoad: ((error: Error) => void) | undefined;

    owned.load.mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          rejectLoad = reject;
        })
    );
    const opening = createMainWindow(registry(), undefined, 'settings');
    const failed = expect(opening).rejects.toThrow('Owned renderer unavailable.');

    if (order === 'after-ready') owned.window?.emit('ready-to-show');
    rejectLoad?.(new Error('Owned renderer unavailable.'));
    await failed;
    expect(owned.destroy).toHaveBeenCalledOnce();
    expect(owned.show).not.toHaveBeenCalled();
    expectReadyCleanup(owned.window);
    expect(owned.window?.listenerCount('closed')).toBe(0);
  }
);

it.each(['closed', 'render-process-gone'] as const)(
  'actual lifecycle rejects %s after loading but before readiness and creates a fresh retry',
  async (terminal) => {
    owned.load.mockResolvedValue();
    const lifecycle = new WindowLifecycle(
      registry(),
      { current: { revision: 0, settings: defaultSettings() } } as unknown as SettingsService,
      { trayAvailable: () => false, shortcutAvailable: () => false, dockAvailable: () => false },
      vi.fn()
    );
    const opening = lifecycle.show('settings');
    const failed = expect(opening).rejects.toThrow('before initialization completed.');
    const first = owned.window;

    await Promise.resolve();
    if (terminal === 'closed') first?.destroy();
    else first?.webContents.emit('render-process-gone', {}, { reason: 'crashed', exitCode: 1 });
    await failed;
    expectReadyCleanup(first);
    expect(owned.destroy).toHaveBeenCalledOnce();
    expect(owned.show).not.toHaveBeenCalled();
    const retry = lifecycle.show('settings');

    expect(owned.count).toBe(2);
    owned.window?.emit('ready-to-show');
    await retry;
    expect(owned.window).not.toBe(first);
    expectReadyCleanup(owned.window);
    await lifecycle.close();
  }
);
