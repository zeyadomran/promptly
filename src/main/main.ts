import path from 'node:path';

import { app, ipcMain, nativeTheme } from 'electron';

import { createDesktopCapture } from './capture/desktop-capture';
import { createDesktopCopy } from './copy/desktop-copy';
import type { CopyService } from './copy/service';
import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { closeLibraryResources } from './lifecycle/close-library-resources';
import { closeNativeResources } from './lifecycle/close-native-resources';
import { closeSettingsStorage } from './lifecycle/close-settings-storage';
import { closeWindowResources } from './lifecycle/close-window-resources';
import { createDesktopShutdown } from './lifecycle/desktop-shutdown';
import { createMacosSelection, type MacosSelection } from './platform/macos/macos-selection';
import { macosPermissionServices } from './platform/macos/permission-services';
import {
  observeSelectionStartup,
  selectionLaunchOptions
} from './platform/native/selection-options';
import type { WindowsSelection } from './platform/windows/windows-selection';
import { createWindowsSelection } from './platform/windows/windows-selection';
import {
  electronSettingsControllers,
  updateWindowBackgrounds
} from './settings/electron-controllers';
import { SettingsService } from './settings/service';
import { createDesktopShortcuts } from './shortcuts/desktop-shortcuts';
import { recorderServices, shortcutServices } from './shortcuts/ipc-services';
import { StorageClient } from './storage/client';
import { storageDesktopServices } from './storage/desktop-services';
import { LibraryMutations } from './storage/library-mutations';
import { nativeTransferDialogs } from './storage/transfer/native-dialogs';
import { StorageTransfer } from './storage/transfer/service';
import { installDesktopMenu } from './windows/desktop-menu';
import { lifecycleServices } from './windows/lifecycle-services';
import { WindowLifecycle } from './windows/window-lifecycle';

let desktop: ReturnType<typeof installDesktopIpc>;
let storage: StorageClient | undefined;
let settings: SettingsService | undefined;
let lifecycle: WindowLifecycle | undefined;
let windowsSelection: WindowsSelection | undefined;
let keyboard: ReturnType<typeof createDesktopShortcuts> | undefined;
let macosSelection: MacosSelection | undefined;
let transfer: StorageTransfer | undefined;
let copy: CopyService | undefined;
let capture: ReturnType<typeof createDesktopCapture> | undefined;
const mutations = new LibraryMutations();
const shutdown = createDesktopShutdown({
  cleanup: () => {
    keyboard?.shortcuts.stopCommands();
    return closeLibraryResources([capture, copy, transfer], () =>
      closeWindowResources(lifecycle, () =>
        closeSettingsStorage(settings, storage, {
          close: () =>
            closeNativeResources([
              keyboard,
              { close: () => windowsSelection?.dispose() ?? Promise.resolve() },
              { close: () => macosSelection?.dispose() ?? Promise.resolve() }
            ])
        })
      )
    );
  },
  onError: (error) => {
    console.error('Unable to close desktop services:', error);
  },
  quit: () => {
    app.quit();
  },
  exit: (code) => {
    app.exit(code);
  }
});
const primaryInstance = app.requestSingleInstanceLock();

if (!primaryInstance) app.quit();
app.on('second-instance', () => {
  openWindow();
});

function openWindow(): void {
  void (async () => {
    await macosSelection?.foregroundIdentityResult();
    await lifecycle?.show();
  })().catch((error: unknown) => {
    console.error('Unable to open Promptly:', error);
    shutdown.fatal();
  });
}

if (primaryInstance)
  void app
    .whenReady()
    .then(async () => {
      if (process.platform === 'darwin') {
        macosSelection = createMacosSelection(selectionLaunchOptions());
        observeSelectionStartup(macosSelection.ready(), 'macOS');
      }

      if (process.platform === 'win32') {
        windowsSelection = createWindowsSelection(selectionLaunchOptions());
        observeSelectionStartup(windowsSelection.ready(), 'Windows');
      }

      storage = new StorageClient(
        path.join(__dirname, 'storage-worker.cjs'),
        path.join(app.getPath('userData'), 'promptly.sqlite'),
        (change) => {
          desktop.publish(change);
        }
      );
      const revision = await storage.ready;

      keyboard = createDesktopShortcuts(
        () => lifecycle,
        () => settings
      );
      settings = new SettingsService(
        storage,
        electronSettingsControllers(
          () => {
            lifecycle?.recoverVisibility();
          },
          undefined,
          keyboard.shortcuts.controller
        )
      );
      await settings.initialize();
      const dialogs = nativeTransferDialogs(
        app.getPath('userData'),
        path.join(app.getPath('userData'), 'promptly.sqlite')
      );

      capture = createDesktopCapture(
        storage,
        mutations,
        settings,
        keyboard,
        windowsSelection ?? macosSelection
      );
      transfer = new StorageTransfer(storage, mutations, dialogs, () => {
        capture?.sources.clear();
      });
      copy = createDesktopCopy(storage, mutations, dialogs, settings, () => lifecycle);
      desktop = installDesktopIpc(
        ipcMain,
        {
          ...storageDesktopServices(storage, mutations, (id) => {
            capture?.sources.forget(id);
          }),
          ...capture.service.services,
          ...transfer.services,
          ...copy.services,
          ...settings.services,
          ...shortcutServices(keyboard.shortcuts),
          ...macosPermissionServices(macosSelection),
          ...lifecycleServices(() => lifecycle)
        },
        revision,
        () => {
          if (settings === undefined) throw new Error('Preferences unavailable.');
          return settings.current;
        },
        recorderServices(keyboard.shortcuts)
      );
      lifecycle = new WindowLifecycle(
        desktop.windows,
        settings,
        {
          trayAvailable: () => false,
          shortcutAvailable: () => keyboard?.shortcuts.recoveryAvailable === true,
          dockAvailable: () => process.platform === 'darwin' && app.dock?.isVisible() === true
        },
        (error) => {
          console.error('Unable to save window geometry:', error);
        }
      );
      installDesktopMenu(openWindow, () => lifecycle);
      nativeTheme.on('updated', updateWindowBackgrounds);
      openWindow();
      app.on('activate', () => {
        openWindow();
      });
    })
    .catch((error: unknown) => {
      console.error('Unable to initialize Promptly:', error);
      shutdown.fatal();
    });

app.on('before-quit', (event) => {
  keyboard?.shortcuts.stopCommands();
  shutdown.beforeQuit(event);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
