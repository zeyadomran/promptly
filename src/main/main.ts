import { app, BrowserWindow, ipcMain } from 'electron';

import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { createQuitGuard } from './lifecycle/quit-guard';
import type { WindowsSelection } from './platform/windows/windows-selection';
import { createWindowsSelection } from './platform/windows/windows-selection';
import { createMainWindow } from './windows/create-main-window';

const desktop = installDesktopIpc(ipcMain);
let windowsSelection: WindowsSelection | undefined;

function openWindow(): void {
  void createMainWindow(desktop.windows).catch((error: unknown) => {
    console.error('Unable to open Promptly:', error);
    app.exit(1);
  });
}

void app.whenReady().then(() => {
  if (process.platform === 'win32') {
    windowsSelection = createWindowsSelection({
      resourcesPath: process.resourcesPath,
      packaged: app.isPackaged,
      applicationPath: app.getAppPath()
    });
    // Start read-only UIA initialization early; capture consumers must still await ready().
    void windowsSelection.ready().catch(() => {
      console.warn('Windows selection helper unavailable');
    });
  }

  openWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });
});

app.on(
  'before-quit',
  createQuitGuard(
    () => windowsSelection?.dispose() ?? Promise.resolve(),
    () => {
      app.quit();
    },
    () => {
      app.exit(1);
    }
  )
);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
