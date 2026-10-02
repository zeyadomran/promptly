import { app, BrowserWindow, nativeTheme } from 'electron';

import type { Settings } from '../../shared/contracts/settings';
import type { SettingsControllers } from './controllers';

export function updateWindowBackgrounds(): void {
  for (const window of BrowserWindow.getAllWindows())
    window.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff');
}

/** Tray (P24/#26) and global shortcuts (P07/#9) inject reversible controllers later. */
export function electronSettingsControllers(): SettingsControllers {
  return {
    available: [
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
          app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
          if (app.getLoginItemSettings().openAtLogin !== settings.launchAtLogin)
            throw new Error('Login preference was rejected.');
          return Promise.resolve();
        }
      },
      ...(process.platform === 'darwin'
        ? [
            {
              name: 'dock icon',
              keys: ['showDockIcon'] as const,
              apply: async (settings: Settings) => {
                if (app.dock === undefined) throw new Error('Dock is unavailable.');
                if (settings.showDockIcon) await app.dock.show();
                else app.dock.hide();
                if (app.dock.isVisible() !== settings.showDockIcon)
                  throw new Error('Dock preference was rejected.');
              }
            }
          ]
        : [])
    ],
    unavailable: [
      'showInTray',
      'saveShortcut',
      'openShortcut',
      'pinShortcut',
      ...(process.platform === 'darwin' ? [] : (['showDockIcon'] as const))
    ]
  };
}
