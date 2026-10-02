import { app, BrowserWindow } from 'electron';

import { createMainWindow } from './windows/create-main-window';

function openWindow(): void {
  void createMainWindow().catch((error: unknown) => {
    console.error('Unable to open Promptly:', error);
    app.exit(1);
  });
}

void app.whenReady().then(() => {
  openWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
