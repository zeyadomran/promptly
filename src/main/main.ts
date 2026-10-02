import path from 'node:path';

import { app, BrowserWindow, ipcMain } from 'electron';

import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { StorageClient } from './storage/client';
import { storageDesktopServices } from './storage/desktop-services';
import { createMainWindow } from './windows/create-main-window';

let desktop: ReturnType<typeof installDesktopIpc>;
let storage: StorageClient | undefined;
let quitting = false;

function openWindow(): void {
  void createMainWindow(desktop.windows).catch((error: unknown) => {
    console.error('Unable to open Promptly:', error);
    app.exit(1);
  });
}

void app
  .whenReady()
  .then(async () => {
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

app.on('before-quit', (event) => {
  if (quitting || storage === undefined) return;
  event.preventDefault();
  quitting = true;
  void storage
    .close()
    .catch((error: unknown) => {
      console.error('Unable to close local storage:', error);
    })
    .finally(() => {
      app.quit();
    });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
