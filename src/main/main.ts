import { app, BrowserWindow, ipcMain } from 'electron';

import { installDesktopIpc } from './ipc/install-desktop-ipc';
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

let quitting = false;

app.on('before-quit', (event) => {
  if (windowsSelection === undefined || quitting) return;
  event.preventDefault();
  quitting = true;
  void windowsSelection.dispose().then(() => {
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
