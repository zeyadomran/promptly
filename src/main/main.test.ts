// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';

const owned = vi.hoisted(() => ({
  events: new Map<string, (event: { preventDefault: () => void }) => void>(),
  ready: vi.fn<() => Promise<number>>(),
  storageClose: vi.fn<() => Promise<void>>(),
  nativeDispose: vi.fn<() => Promise<void>>(),
  window: vi.fn<() => Promise<void>>(),
  quit: vi.fn(),
  exit: vi.fn()
}));

vi.mock('electron', () => ({
  app: {
    whenReady: () => Promise.resolve(),
    on: (name: string, callback: (event: { preventDefault: () => void }) => void) =>
      owned.events.set(name, callback),
    getPath: () => 'owned-test-profile',
    getAppPath: () => 'owned-test-application',
    isPackaged: false,
    quit: owned.quit,
    exit: owned.exit
  },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: {}
}));
vi.mock('./storage/client', () => ({
  StorageClient: class {
    ready = owned.ready();
    close = owned.storageClose;
  }
}));
vi.mock('./platform/windows/windows-selection', () => ({
  createWindowsSelection: () => ({
    ready: () => new Promise<void>(() => undefined),
    dispose: owned.nativeDispose
  })
}));
vi.mock('./storage/desktop-services', () => ({ storageDesktopServices: () => ({}) }));
vi.mock('./ipc/install-desktop-ipc', () => ({
  installDesktopIpc: () => ({ windows: {}, publish: vi.fn() })
}));
vi.mock('./windows/create-main-window', () => ({ createMainWindow: owned.window }));

afterEach(() => {
  vi.restoreAllMocks();
});

it.skipIf(process.platform !== 'win32').each(['storage', 'window'] as const)(
  'actual main fatal %s path waits for the warming native helper to close',
  async (failure) => {
    vi.resetModules();
    vi.clearAllMocks();
    owned.events.clear();
    const error = new Error('Owned initialization failure');
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let finishNative: (() => void) | undefined;

    owned.ready.mockImplementation(() =>
      failure === 'storage' ? Promise.reject(error) : Promise.resolve(0)
    );
    owned.window.mockRejectedValue(error);
    owned.storageClose.mockResolvedValue();
    owned.nativeDispose.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishNative = resolve;
        })
    );
    await import('./main');
    await vi.waitFor(() => {
      expect(owned.nativeDispose).toHaveBeenCalledOnce();
    });
    expect(report).toHaveBeenCalledWith(
      failure === 'storage' ? 'Unable to initialize Promptly:' : 'Unable to open Promptly:',
      error
    );
    expect(owned.storageClose).toHaveBeenCalledOnce();
    expect(owned.exit).not.toHaveBeenCalled();
    const preventDefault = vi.fn();

    owned.events.get('before-quit')?.({ preventDefault });
    owned.events.get('before-quit')?.({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(owned.nativeDispose).toHaveBeenCalledOnce();
    if (finishNative === undefined) throw new Error('Missing warming helper cleanup');
    finishNative();
    await vi.waitFor(() => {
      expect(owned.exit).toHaveBeenCalledExactlyOnceWith(1);
    });
    expect(owned.quit).not.toHaveBeenCalled();
  }
);
