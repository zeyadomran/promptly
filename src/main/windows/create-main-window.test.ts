import { afterEach, expect, it, vi } from 'vitest';

import type { WindowRegistry } from '../ipc/window-registry';
import { createMainWindow } from './create-main-window';

const owned = vi.hoisted(() => ({
  load: vi.fn<() => Promise<void>>(),
  show: vi.fn(),
  destroy: vi.fn(),
  ready: undefined as (() => void) | undefined
}));

vi.mock('electron', () => ({
  BrowserWindow: class {
    webContents = { setWindowOpenHandler: vi.fn(), on: vi.fn() };
    once(_event: string, listener: () => void) {
      owned.ready = listener;
    }
    loadURL = owned.load;
    show = owned.show;
    destroy = owned.destroy;
  },
  nativeTheme: { shouldUseDarkColors: false },
  screen: {
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
});

function registry() {
  vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', 'file:///owned-renderer/index.html');
  vi.stubGlobal('MAIN_WINDOW_VITE_NAME', 'main_window');
  return { register: vi.fn() } as unknown as WindowRegistry;
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
  owned.ready?.();
  await opening;
  expect(owned.show).toHaveBeenCalledOnce();
  // Even a duplicate native notification cannot reopen the window after the caller hides it.
  owned.show.mockClear();
  owned.ready?.();
  await Promise.resolve();
  expect(owned.show).not.toHaveBeenCalled();
});

it('destroys an owned registered window after renderer load rejection and allows a clean retry', async () => {
  owned.load.mockRejectedValueOnce(new Error('Owned renderer unavailable.'));
  await expect(createMainWindow(registry(), undefined, 'settings')).rejects.toThrow(
    'Owned renderer unavailable.'
  );
  expect(owned.destroy).toHaveBeenCalledOnce();
  expect(owned.show).not.toHaveBeenCalled();
  owned.load.mockImplementationOnce(() => {
    queueMicrotask(() => {
      owned.ready?.();
    });
    return Promise.resolve();
  });
  await createMainWindow(registry(), undefined, 'settings');
  expect(owned.show).toHaveBeenCalledOnce();
});
