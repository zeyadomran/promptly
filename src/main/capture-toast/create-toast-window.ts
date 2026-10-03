import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { BrowserWindow, type IpcMainEvent, session } from 'electron';

import {
  type CaptureToast,
  captureToastActivationChannel,
  captureToastActivationSchema,
  captureToastChannel
} from '../../shared/contracts/capture-toast';
import { installRendererAssets } from '../windows/install-renderer-assets';
import { loadWindowRenderer } from '../windows/load-window-renderer';
import { markOverlayWindow } from '../windows/overlay-windows';
import type { ToastWindow } from './ports';

export async function createToastWindow(
  signal: AbortSignal,
  activate: (version: number) => void
): Promise<ToastWindow> {
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
    focusable: true,
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
  const contents = window.webContents;
  let presented: CaptureToast | undefined;
  const activated = (event: IpcMainEvent, channel: string, ...args: unknown[]) => {
    if (
      canceled() ||
      window.isDestroyed() ||
      !window.isVisible() ||
      channel !== captureToastActivationChannel ||
      event.sender !== contents ||
      event.senderFrame !== contents.mainFrame ||
      event.senderFrame.url !== new URL(url).href ||
      presented?.phase !== 'visible' ||
      args.length !== 1
    )
      return;
    const version = captureToastActivationSchema.safeParse(args[0]);

    if (version.success && version.data === presented.version) activate(version.data);
  };

  const hidden = () => {
    presented = undefined;
  };

  // Scope the sole command to this owned WebContents; the overlay gets no desktop IPC authority.
  contents.on('ipc-message', activated);
  window.on('hide', hidden);
  const destroy = () => {
    if (!window.isDestroyed()) window.destroy();
  };

  signal.addEventListener('abort', destroy, { once: true });
  window.once('closed', () => {
    signal.removeEventListener('abort', destroy);
    contents.removeListener('ipc-message', activated);
    contents.removeListener('render-process-gone', destroy);
    window.removeListener('hide', hidden);
    presented = undefined;
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  contents.on('render-process-gone', destroy);
  try {
    await loadWindowRenderer(window, url);
    if (canceled() || window.isDestroyed()) throw new Error('Confirmation overlay retired.');
    return {
      alive: () => !window.isDestroyed(),
      visible: () => !window.isDestroyed() && window.isVisible(),
      present: (toast, bounds) => {
        if (window.isDestroyed()) return;
        window.setBounds(bounds, false);
        window.webContents.send(captureToastChannel, toast);
        window.showInactive();
        presented = toast;
      },
      hide: () => {
        presented = undefined;
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
