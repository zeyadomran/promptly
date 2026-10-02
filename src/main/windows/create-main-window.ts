import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { BrowserWindow, nativeTheme, session } from 'electron';

import {
  defaultSettings,
  type SettingsSnapshot,
  settingsSnapshotSchema
} from '../../shared/contracts/settings';
import { settingsArgumentPrefix } from '../../shared/settings-bootstrap';
import { liveSettingsArgument } from '../../shared/settings-bootstrap';
import { styleNonceArgumentPrefix } from '../../shared/style-nonce';
import type { WindowRegistry } from '../ipc/window-registry';
import { installRendererAssets } from './install-renderer-assets';

export async function createMainWindow(
  windows: WindowRegistry,
  initial?: SettingsSnapshot
): Promise<BrowserWindow> {
  const snapshot = settingsSnapshotSchema.parse(
    initial ?? { revision: 0, settings: defaultSettings() }
  );
  const preferences = snapshot.settings;
  const bounds = preferences.rememberedBounds[preferences.defaultSizeMode];
  const isolatedSession = session.fromPartition('promptly');
  const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
  const bundledPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
  const styleNonce = installRendererAssets(
    isolatedSession,
    bundledPath,
    devUrl === undefined || devUrl === ''
  );

  isolatedSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  isolatedSession.setPermissionCheckHandler(() => false);

  const window = new BrowserWindow({
    title: 'Promptly',
    width: preferences.defaultSizeMode === 'compact' ? 440 : 900,
    height: 640,
    ...bounds,
    minWidth: 400,
    minHeight: 320,
    show: false,
    alwaysOnTop: preferences.alwaysOnTop,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      session: isolatedSession,
      additionalArguments: [
        `${styleNonceArgumentPrefix}${styleNonce}`,
        `${settingsArgumentPrefix}${encodeURIComponent(JSON.stringify(snapshot))}`,
        ...(initial === undefined ? [] : [liveSettingsArgument])
      ],
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

  const url = new URL(
    devUrl !== undefined && devUrl !== '' ? devUrl : pathToFileURL(bundledPath).href
  ).href;

  windows.register(window.webContents, url);
  await window.loadURL(url);

  return window;
}
