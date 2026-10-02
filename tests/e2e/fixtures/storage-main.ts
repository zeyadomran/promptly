import path from 'node:path';

import { app, ipcMain } from 'electron';

import { installDesktopIpc } from '../../../src/main/ipc/install-desktop-ipc';
import { StorageClient } from '../../../src/main/storage/client';
import { storageDesktopServices } from '../../../src/main/storage/desktop-services';
import { createMainWindow } from '../../../src/main/windows/create-main-window';

let storage: StorageClient;
let closing = false;

void app.whenReady().then(async () => {
  const filename = process.env['PROMPTLY_STORAGE_FIXTURE_DATABASE'];

  if (filename === undefined) throw new Error('Test database is required.');
  storage = new StorageClient(
    path.resolve('.vite/build/storage-worker.cjs'),
    filename,
    (change) => {
      desktop.publish(change);
    }
  );
  const revision = await storage.ready;
  const desktop = installDesktopIpc(ipcMain, storageDesktopServices(storage), revision);

  await createMainWindow(desktop.windows);
  await createMainWindow(desktop.windows);
});
app.on('window-all-closed', () => {
  app.quit();
});
app.on('before-quit', (event) => {
  if (closing) return;
  event.preventDefault();
  closing = true;
  void storage.close().finally(() => {
    app.quit();
  });
});
