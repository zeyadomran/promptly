import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { BrowserWindow, session } from 'electron';

import type { WindowRegistry } from '../ipc/window-registry';

export async function createMainWindow(windows: WindowRegistry): Promise<BrowserWindow> {
  const isolatedSession = session.fromPartition('promptly');

  isolatedSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  isolatedSession.setPermissionCheckHandler(() => false);

  const window = new BrowserWindow({
    title: 'Promptly',
    width: 560,
    height: 640,
    minWidth: 400,
    minHeight: 320,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      session: isolatedSession,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  window.once('ready-to-show', () => {
    window.show();
  });

  const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
  const bundledPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
  const url = new URL(
    devUrl !== undefined && devUrl !== '' ? devUrl : pathToFileURL(bundledPath).href
  ).href;

  windows.register(window.webContents, url);
  await window.loadURL(url);

  return window;
}
