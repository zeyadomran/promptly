import { app, BrowserWindow, nativeTheme } from 'electron';

import type { Settings } from '../../shared/contracts/settings';
import { updateNativeChrome } from '../windows/native-chrome';
import { setPinnedWorkspaces } from '../windows/pinned-workspaces';
import type { SettingsController, SettingsControllers } from './controllers';
import { createDockController, type DockVisibility } from './dock-controller';

/** Owned fixtures replace this OS boundary while exercising the production readback/rollback logic. */
export interface NativePreferences {
  setLogin: (enabled: boolean) => void;
  getLogin: () => boolean;
  dock: DockVisibility | undefined;
}

export function updateWindowBackgrounds(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff');
    updateNativeChrome(window);
  }
}

/** Tray (P24/#26) injects its reversible controller later. */
export function electronSettingsControllers(
  recoverVisibility: () => void = () => undefined,
  native: NativePreferences = {
    setLogin: (openAtLogin) => {
      app.setLoginItemSettings({ openAtLogin });
    },
    getLogin: () => app.getLoginItemSettings().openAtLogin,
    dock: app.dock
  },
  shortcuts?: SettingsController
): SettingsControllers {
  const dock = createDockController(native.dock);

  return {
    available: [
      ...(shortcuts === undefined ? [] : [shortcuts]),
      {
        name: 'theme',
        keys: ['theme'],
        apply: (settings: Settings) => {
          nativeTheme.themeSource = settings.theme;
          updateWindowBackgrounds();
          return Promise.resolve();
        }
      },
      {
        name: 'pin',
        keys: ['alwaysOnTop'],
        apply: (settings: Settings) => {
          for (const window of BrowserWindow.getAllWindows()) {
            window.setAlwaysOnTop(settings.alwaysOnTop);
            setPinnedWorkspaces(window, settings.alwaysOnTop);
            if (window.isAlwaysOnTop() !== settings.alwaysOnTop)
              throw new Error('Pin was rejected.');
          }

          return Promise.resolve();
        }
      },
      {
        name: 'launch at login',
        keys: ['launchAtLogin'],
        apply: (settings: Settings) => {
          native.setLogin(settings.launchAtLogin);
          if (native.getLogin() !== settings.launchAtLogin)
            throw new Error('Login preference was rejected.');
          return Promise.resolve();
        }
      },
      ...(process.platform === 'darwin'
        ? [
            {
              ...dock,
              apply: async (settings: Settings) => {
                if (!settings.showDockIcon) recoverVisibility();
                await dock.apply(settings);
              }
            }
          ]
        : [])
    ],
    unavailable: [
      'showInTray',
      ...(shortcuts === undefined
        ? (['saveShortcut', 'openShortcut', 'pinShortcut'] as const)
        : []),
      ...(process.platform === 'darwin' ? [] : (['showDockIcon'] as const))
    ]
  };
}
