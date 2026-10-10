import { randomUUID } from 'node:crypto';

import { BrowserWindow } from 'electron';

export function rasterWindow() {
  const window = new BrowserWindow({
    show: false,
    skipTaskbar: true,
    focusable: false,
    width: 1,
    height: 1,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      webSecurity: true,
      nodeIntegration: false,
      offscreen: true,
      partition: `promptly-raster-${randomUUID()}`
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  window.webContents.on('will-redirect', (event) => {
    event.preventDefault();
  });
  const session = window.webContents.session;

  session.setPermissionCheckHandler(() => false);
  session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  session.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*', 'file://*/*', 'ws://*/*', 'wss://*/*'] },
    (_request, callback) => {
      callback({ cancel: true });
    }
  );
  const ready = window
    .loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; img-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">`
        )
    )
    .catch((error: unknown) => {
      if (!window.isDestroyed()) window.destroy();
      throw error;
    });

  return { window, ready };
}
