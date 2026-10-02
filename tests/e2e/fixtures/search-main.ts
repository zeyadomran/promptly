import { EventEmitter } from 'node:events';
import path from 'node:path';

import { app, ipcMain } from 'electron';

import { installDesktopIpc } from '../../../src/main/ipc/install-desktop-ipc';
import { createQuitCoordinator } from '../../../src/main/lifecycle/quit-coordinator';
import { StorageClient } from '../../../src/main/storage/client';
import { storageDesktopServices } from '../../../src/main/storage/desktop-services';
import { createMainWindow } from '../../../src/main/windows/create-main-window';

let storage: StorageClient | undefined;

void app.whenReady().then(async () => {
  const filename = process.env['PROMPTLY_SEARCH_DATABASE'];
  const workerFile = process.env['PROMPTLY_SEARCH_WORKER'];

  if (filename === undefined || workerFile === undefined)
    throw new Error('Search fixture paths required.');
  const started = performance.now();

  storage = new StorageClient(workerFile, filename, (change) => {
    desktop.publish(change);
  });
  const revision = await storage.ready;

  EventEmitter.prototype.on.call(
    app,
    'search-fixture:capture',
    (reply: (result: unknown) => void) => {
      void storage
        ?.call('captureSnippet', {
          text: 'fresh captured fixture',
          sourceApp: 'Terminal',
          sourceAppId: 'terminal.exe'
        })
        .then(reply);
    }
  );

  console.log(
    JSON.stringify({
      indexStartupMs: performance.now() - started,
      versions: process.versions,
      database: path.basename(filename)
    })
  );
  const desktop = installDesktopIpc(ipcMain, storageDesktopServices(storage), revision);

  const window = await createMainWindow(desktop.windows);

  window.setContentSize(1000, 640);
  app.focus({ steal: true });
  window.focus();
});
app.on('window-all-closed', () => {
  app.quit();
});
app.on(
  'before-quit',
  createQuitCoordinator({
    cleanup: () => storage?.close() ?? Promise.resolve(),
    onError: console.error,
    quit: () => {
      app.quit();
    }
  })
);
