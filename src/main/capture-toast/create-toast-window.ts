import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { BrowserWindow, session } from 'electron';

import { captureToastChannel } from '../../shared/contracts/capture-toast';
import { installRendererAssets } from '../windows/install-renderer-assets';
import { loadWindowRenderer } from '../windows/load-window-renderer';
import { markOverlayWindow } from '../windows/overlay-windows';
import type { ToastWindow } from './ports';

export async function createToastWindow(signal: AbortSignal): Promise<ToastWindow> {
  const canceled = () => signal.aborted;

  if (canceled()) throw new Error('Confirmation overlay retired.');
  // Asset handlers are directory-scoped and cached per session. Never share the main session.
  const isolated = session.fromPartition('promptly-capture-toast');
  const bundled = path.join(__dirname, `../renderer/${CAPTURE_TOAST_VITE_NAME}/index.html`);
  const dev = CAPTURE_TOAST_VITE_DEV_SERVER_URL;
  const url = dev !== undefined && dev !== '' ? dev : pathToFileURL(bundled).href;

  installRendererAssets(isolated, bundled, dev === undefined || dev === '');
  isolated.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  isolated.setPermissionCheckHandler(() => false);
  const window = new BrowserWindow({
    title: 'Promptly confirmation',
    width: 330,
    height: 110,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'capture-toast-preload.cjs'),
      session: isolated,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      devTools: false
    }
  });

  markOverlayWindow(window);
  window.setAlwaysOnTop(true, 'pop-up-menu');
  window.setIgnoreMouseEvents(true);
  const destroy = () => {
    if (!window.isDestroyed()) window.destroy();
  };

  signal.addEventListener('abort', destroy, { once: true });
  window.once('closed', () => {
    signal.removeEventListener('abort', destroy);
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  window.webContents.on('render-process-gone', destroy);
  try {
    await loadWindowRenderer(window, url);
    if (canceled() || window.isDestroyed()) throw new Error('Confirmation overlay retired.');
    return {
      alive: () => !window.isDestroyed(),
      present: (toast, bounds) => {
        if (window.isDestroyed()) return;
        window.setBounds(bounds, false);
        window.webContents.send(captureToastChannel, toast);
        window.showInactive();
      },
      hide: () => {
        if (window.isDestroyed()) return;
        window.hide();
        window.webContents.send(captureToastChannel, null);
      },
      destroy
    };
  } catch (error) {
    destroy();
    throw error;
  }
}
