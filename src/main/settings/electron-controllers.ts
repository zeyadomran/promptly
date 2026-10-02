import { app, BrowserWindow, nativeTheme } from 'electron';

import type { Settings } from '../../shared/contracts/settings';
import { updateNativeChrome } from '../windows/native-chrome';
import type { SettingsController, SettingsControllers } from './controllers';

/** Owned fixtures replace this OS boundary while exercising the production readback/rollback logic. */
export interface NativePreferences {
  setLogin: (enabled: boolean) => void;
  getLogin: () => boolean;
}

export function updateWindowBackgrounds(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff');
    updateNativeChrome(window);
  }
}

/** Main supplies reversible shortcut and tray owners before applying persisted preferences. */
export function electronSettingsControllers(
  native: NativePreferences = {
    setLogin: (openAtLogin) => {
      app.setLoginItemSettings({ openAtLogin });
    },
    getLogin: () => app.getLoginItemSettings().openAtLogin
  },
  shortcuts?: SettingsController,
  tray?: SettingsController
): SettingsControllers {
  return {
    available: [
      ...(shortcuts === undefined ? [] : [shortcuts]),
      ...(tray === undefined ? [] : [tray]),
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
      }
    ],
    unavailable: [
      ...(tray === undefined ? (['showInTray'] as const) : []),
      ...(shortcuts === undefined ? (['saveShortcut', 'openShortcut', 'pinShortcut'] as const) : [])
    ]
  };
}
