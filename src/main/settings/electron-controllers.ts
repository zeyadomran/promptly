import { app, BrowserWindow, nativeTheme } from 'electron';

import type { Settings } from '../../shared/contracts/settings';
import { updateNativeChrome } from '../windows/native-chrome';
import { isOverlayWindow } from '../windows/overlay-windows';
import type { SettingsController, SettingsControllers } from './controllers';
import type { NativePreferences } from './login-preferences';
import { loginPreferences } from './login-preferences';

export type { NativePreferences } from './login-preferences';

export function updateWindowBackgrounds(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (isOverlayWindow(window)) continue;
    window.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff');
    updateNativeChrome(window);
  }
}

/** Main supplies reversible shortcut and tray owners before applying persisted preferences. */
export function electronSettingsControllers(
  native: NativePreferences = loginPreferences(app),
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
            if (isOverlayWindow(window)) continue;
            window.setAlwaysOnTop(settings.alwaysOnTop);
            if (window.isAlwaysOnTop() !== settings.alwaysOnTop)
              throw new Error('Pin was rejected.');
          }

          return Promise.resolve();
        }
      },
      {
        name: 'launch at login',
        optionalStartup: true,
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
