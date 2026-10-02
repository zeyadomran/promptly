import path from 'node:path';

import { app, BrowserWindow, ipcMain } from 'electron';

import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { closeDesktopServices } from './lifecycle/close-desktop-services';
import { createQuitCoordinator } from './lifecycle/quit-coordinator';
import type { WindowsSelection } from './platform/windows/windows-selection';
import { createWindowsSelection } from './platform/windows/windows-selection';
import { StorageClient } from './storage/client';
import { storageDesktopServices } from './storage/desktop-services';
import { createMainWindow } from './windows/create-main-window';
let desktop: ReturnType<typeof installDesktopIpc>;
let storage: StorageClient | undefined;
let windowsSelection: WindowsSelection | undefined;

function openWindow(): void {
  void createMainWindow(desktop.windows).catch((error: unknown) => {
    console.error('Unable to open Promptly:', error);
    app.exit(1);
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
      // Initialize UIA before capture is needed, independently of the storage worker.
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

    desktop = installDesktopIpc(ipcMain, storageDesktopServices(storage), revision);
    openWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) openWindow();
    });
  })
  .catch((error: unknown) => {
    console.error('Unable to initialize Promptly:', error);
    app.exit(1);
  });
app.on(
  'before-quit',
  createQuitCoordinator({
    cleanup: () =>
      closeDesktopServices([
        () => storage?.close() ?? Promise.resolve(),
        () => windowsSelection?.dispose() ?? Promise.resolve()
      ]),
    onError: (error) => {
      console.error('Unable to close desktop services:', error);
    },
    quit: () => {
      app.quit();
    }
  })
);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
