import path from 'node:path';

import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';

import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { closeSettingsStorage } from './lifecycle/close-settings-storage';
import { createDesktopShutdown } from './lifecycle/desktop-shutdown';
import type { WindowsSelection } from './platform/windows/windows-selection';
import { createWindowsSelection } from './platform/windows/windows-selection';
import {
  electronSettingsControllers,
  updateWindowBackgrounds
} from './settings/electron-controllers';
import { SettingsService } from './settings/service';
import { StorageClient } from './storage/client';
import { storageDesktopServices } from './storage/desktop-services';
import { createMainWindow } from './windows/create-main-window';

let desktop: ReturnType<typeof installDesktopIpc>;
let storage: StorageClient | undefined;
let settings: SettingsService | undefined;
let windowsSelection: WindowsSelection | undefined;
const shutdown = createDesktopShutdown({
  cleanup: () =>
    closeSettingsStorage(settings, storage, {
      close: () => windowsSelection?.dispose() ?? Promise.resolve()
    }),
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

function openWindow(): void {
  void createMainWindow(desktop.windows, settings?.current).catch((error: unknown) => {
    console.error('Unable to open Promptly:', error);
    shutdown.fatal();
  });
}

void app
  .whenReady()
  .then(async () => {
    if (process.platform === 'win32') {
      windowsSelection = createWindowsSelection({
        resourcesPath: process.resourcesPath,
        packaged: app.isPackaged,
        applicationPath: app.getAppPath()
      });
      void windowsSelection.ready().catch(() => {
        console.warn('Windows selection helper unavailable');
      });
    }

    storage = new StorageClient(
      path.join(__dirname, 'storage-worker.cjs'),
      path.join(app.getPath('userData'), 'promptly.sqlite'),
      (change) => {
        desktop.publish(change);
      }
    );
    const revision = await storage.ready;

    settings = new SettingsService(storage, electronSettingsControllers());
    await settings.initialize();
    desktop = installDesktopIpc(
      ipcMain,
      { ...storageDesktopServices(storage), ...settings.services },
      revision,
      () => {
        if (settings === undefined) throw new Error('Preferences unavailable.');
        return settings.current;
      }
    );
    nativeTheme.on('updated', updateWindowBackgrounds);
    openWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) openWindow();
    });
  })
  .catch((error: unknown) => {
    console.error('Unable to initialize Promptly:', error);
    shutdown.fatal();
  });

app.on('before-quit', shutdown.beforeQuit);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
