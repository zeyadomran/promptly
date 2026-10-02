import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { BrowserWindow, nativeTheme, screen, session } from 'electron';

import {
  defaultSettings,
  type SettingsSnapshot,
  settingsSnapshotSchema
} from '../../shared/contracts/settings';
import type { WindowKind } from '../../shared/contracts/window';
import { settingsArgumentPrefix } from '../../shared/settings-bootstrap';
import { liveSettingsArgument } from '../../shared/settings-bootstrap';
import { styleNonceArgumentPrefix } from '../../shared/style-nonce';
import type { WindowRegistry } from '../ipc/window-registry';
import { initialBounds, windowGeometry } from './geometry';
import { installRendererAssets } from './install-renderer-assets';
import { loadWindowRenderer } from './load-window-renderer';
import { registerNativeChrome } from './native-chrome';

export async function createMainWindow(
  windows: WindowRegistry,
  initial?: SettingsSnapshot,
  kind: WindowKind = 'main',
  created?: (window: BrowserWindow) => void
): Promise<BrowserWindow> {
  const snapshot = settingsSnapshotSchema.parse(
    initial ?? { revision: 0, settings: defaultSettings() }
  );
  const preferences = snapshot.settings;
  const areas = [
    screen.getPrimaryDisplay(),
    ...screen.getAllDisplays().filter((display) => display.id !== screen.getPrimaryDisplay().id)
  ].map((display) => display.workArea);
  const bounds = initialBounds(preferences, areas, kind);
  const geometry = windowGeometry(kind, preferences.defaultSizeMode);
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
    title:
      kind === 'settings' ? 'Settings' : kind === 'onboarding' ? 'Set up Promptly' : 'Promptly',
    ...bounds,
    minWidth: Math.min(geometry.minWidth, bounds.width),
    minHeight: Math.min(geometry.minHeight, bounds.height),
    ...(kind === 'main' && preferences.defaultSizeMode === 'compact'
      ? { maxWidth: bounds.width }
      : {}),
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    titleBarOverlay: {
      height: kind === 'main' ? 40 : 38,
      color: nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff',
      symbolColor: nativeTheme.shouldUseDarkColors ? '#fafafa' : '#18181b'
    },
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

  registerNativeChrome(window);
  created?.(window);

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  const rendererUrl = new URL(
    devUrl !== undefined && devUrl !== '' ? devUrl : pathToFileURL(bundledPath).href
  );

  if (kind !== 'main') rendererUrl.hash = kind;
  const url = rendererUrl.href;

  windows.register(window.webContents, url);
  try {
    await loadWindowRenderer(window, url);
    if (window.isDestroyed()) throw new Error('Window closed before initialization completed.');
    window.show();
  } catch (error) {
    // A registered but failed window must never become a reusable blank recovery route.
    if (!window.isDestroyed()) window.destroy();
    throw error;
  }

  return window;
}
