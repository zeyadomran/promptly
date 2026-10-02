// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';

const owned = vi.hoisted(() => ({
  events: new Map<string, (event: { preventDefault: () => void }) => void>(),
  ready: vi.fn<() => Promise<number>>(),
  storageClose: vi.fn<() => Promise<void>>(),
  settingsClose: vi.fn<() => Promise<void>>(),
  settingsInitialize: vi.fn<() => Promise<void>>(),
  nativeDispose: vi.fn<() => Promise<void>>(),
  keyboardClose: vi.fn<() => Promise<void>>(),
  stopCommands: vi.fn(),
  foreground: vi.fn<() => Promise<{ status: 'foregroundChanged' }>>(),
  window: vi.fn<() => Promise<void>>(),
  windowClose: vi.fn<() => Promise<void>>(),
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
    requestSingleInstanceLock: () => true,
    quit: owned.quit,
    exit: owned.exit
  },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: {},
  Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: vi.fn() },
  nativeTheme: { on: vi.fn() },
  shell: { openExternal: vi.fn() }
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
vi.mock('./platform/macos/macos-selection', () => ({
  createMacosSelection: () => ({
    ready: () => new Promise<void>(() => undefined),
    foregroundIdentityResult: owned.foreground,
    dispose: owned.nativeDispose
  })
}));
vi.mock('./storage/desktop-services', () => ({ storageDesktopServices: () => ({}) }));
vi.mock('./settings/electron-controllers', () => ({
  electronSettingsControllers: () => ({}),
  updateWindowBackgrounds: vi.fn()
}));
vi.mock('./settings/service', () => ({
  SettingsService: class {
    current = {};
    services = {};
    initialize = owned.settingsInitialize;
    close = owned.settingsClose;
  }
}));
vi.mock('./ipc/install-desktop-ipc', () => ({
  installDesktopIpc: () => ({ windows: {}, publish: vi.fn() })
}));
vi.mock('./windows/window-lifecycle', () => ({
  WindowLifecycle: class {
    show = owned.window;
    close = owned.windowClose;
  }
}));
vi.mock('./shortcuts/desktop-shortcuts', () => ({
  createDesktopShortcuts: () => ({
    shortcuts: { controller: {}, stopCommands: owned.stopCommands },
    close: owned.keyboardClose
  })
}));
vi.mock('./shortcuts/ipc-services', () => ({
  shortcutServices: () => ({}),
  recorderServices: () => () => ({})
}));

afterEach(() => {
  vi.restoreAllMocks();
});

it.skipIf(process.platform !== 'win32').each(['normal', 'fatal'] as const)(
  'actual main %s shutdown drains geometry then settings before storage and native resources',
  async (path) => {
    vi.resetModules();
    vi.clearAllMocks();
    owned.events.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let geometryDone: (() => void) | undefined;
    let settingsDone: (() => void) | undefined;

    owned.ready.mockResolvedValue(0);
    owned.window.mockResolvedValue();
    owned.settingsInitialize.mockResolvedValue();
    owned.storageClose.mockResolvedValue();
    owned.nativeDispose.mockResolvedValue();
    owned.keyboardClose.mockResolvedValue();
    owned.windowClose.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          geometryDone = resolve;
        })
    );
    owned.settingsClose.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          settingsDone = resolve;
        })
    );
    await import('./main');
    await vi.waitFor(() => {
      expect(owned.window).toHaveBeenCalledOnce();
    });
    const event = { preventDefault: vi.fn() };

    if (path === 'fatal') {
      owned.window.mockRejectedValueOnce(new Error('Owned reopen failure'));
      owned.events.get('activate')?.(event);
    } else owned.events.get('before-quit')?.(event);
    await vi.waitFor(() => {
      expect(owned.windowClose).toHaveBeenCalledOnce();
    });
    expect(owned.settingsClose).not.toHaveBeenCalled();
    expect(owned.storageClose).not.toHaveBeenCalled();
    expect(owned.nativeDispose).not.toHaveBeenCalled();
    expect(owned.stopCommands).toHaveBeenCalled();
    expect(owned.keyboardClose).not.toHaveBeenCalled();
    geometryDone?.();
    await vi.waitFor(() => {
      expect(owned.settingsClose).toHaveBeenCalledOnce();
    });
    expect(owned.storageClose).not.toHaveBeenCalled();
    expect(owned.nativeDispose).not.toHaveBeenCalled();
    expect(owned.keyboardClose).not.toHaveBeenCalled();
    settingsDone?.();
    await vi.waitFor(() => {
      if (path === 'fatal') expect(owned.exit).toHaveBeenCalledExactlyOnceWith(1);
      else expect(owned.quit).toHaveBeenCalledOnce();
    });
    expect(owned.storageClose).toHaveBeenCalledOnce();
    expect(owned.nativeDispose).toHaveBeenCalledOnce();
    expect(owned.keyboardClose).toHaveBeenCalledOnce();
  }
);
