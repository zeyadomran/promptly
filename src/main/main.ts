import path from 'node:path';

import { app, ipcMain, Menu, nativeTheme } from 'electron';

import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { closeDesktopServices } from './lifecycle/close-desktop-services';
import { closeSettingsStorage } from './lifecycle/close-settings-storage';
import { closeWindowResources } from './lifecycle/close-window-resources';
import { createDesktopShutdown } from './lifecycle/desktop-shutdown';
import { createMacosSelection, type MacosSelection } from './platform/macos/macos-selection';
import { macosPermissionServices } from './platform/macos/permission-services';
import type { WindowsSelection } from './platform/windows/windows-selection';
import { createWindowsSelection } from './platform/windows/windows-selection';
import {
  electronSettingsControllers,
  updateWindowBackgrounds
} from './settings/electron-controllers';
import { SettingsService } from './settings/service';
import { StorageClient } from './storage/client';
import { storageDesktopServices } from './storage/desktop-services';
import { lifecycleServices } from './windows/lifecycle-services';
import { WindowLifecycle } from './windows/window-lifecycle';

let desktop: ReturnType<typeof installDesktopIpc>;
let storage: StorageClient | undefined;
let settings: SettingsService | undefined;
let lifecycle: WindowLifecycle | undefined;
let windowsSelection: WindowsSelection | undefined;
let macosSelection: MacosSelection | undefined;
const shutdown = createDesktopShutdown({
  cleanup: () =>
    closeWindowResources(lifecycle, () =>
      closeSettingsStorage(settings, storage, {
        close: () =>
          closeDesktopServices([
            () => windowsSelection?.dispose() ?? Promise.resolve(),
            () => macosSelection?.dispose() ?? Promise.resolve()
          ])
      })
    ),
  onError: (error) => {
    console.error('Unable to close desktop services:', error);
  },
  quit: () => {
    app.quit();
  },
  exit: (code) => {
    app.exit(code);
  }
});
const primaryInstance = app.requestSingleInstanceLock();

if (!primaryInstance) app.quit();
app.on('second-instance', () => {
  openWindow();
});

function openWindow(): void {
  void (async () => {
    await macosSelection?.foregroundIdentityResult();
    await lifecycle?.show();
  })().catch((error: unknown) => {
    console.error('Unable to open Promptly:', error);
    shutdown.fatal();
  });
}

if (primaryInstance)
  void app
    .whenReady()
    .then(async () => {
      if (process.platform === 'darwin') {
        macosSelection = createMacosSelection({
          resourcesPath: process.resourcesPath,
          packaged: app.isPackaged,
          applicationPath: app.getAppPath()
        });
        void macosSelection.ready().catch(() => {
          console.warn('macOS selection helper unavailable');
        });
      }

      if (process.platform === 'win32') {
        windowsSelection = createWindowsSelection({
          resourcesPath: process.resourcesPath,
          packaged: app.isPackaged,
          applicationPath: app.getAppPath()
        });
        void windowsSelection.ready().catch(() => {
          console.warn('Windows selection helper unavailable');
        });
      }

      storage = new StorageClient(
        path.join(__dirname, 'storage-worker.cjs'),
        path.join(app.getPath('userData'), 'promptly.sqlite'),
        (change) => {
          desktop.publish(change);
        }
      );
      const revision = await storage.ready;

      settings = new SettingsService(
        storage,
        electronSettingsControllers(() => {
          lifecycle?.recoverVisibility();
        })
      );
      await settings.initialize();
      desktop = installDesktopIpc(
        ipcMain,
        {
          ...storageDesktopServices(storage),
          ...settings.services,
          ...macosPermissionServices(macosSelection),
          ...lifecycleServices(() => lifecycle)
        },
        revision,
        () => {
          if (settings === undefined) throw new Error('Preferences unavailable.');
          return settings.current;
        }
      );
      lifecycle = new WindowLifecycle(
        desktop.windows,
        settings,
        {
          trayAvailable: () => false,
          shortcutAvailable: () => false,
          dockAvailable: () => process.platform === 'darwin' && app.dock?.isVisible() === true
        },
        (error) => {
          console.error('Unable to save window geometry:', error);
        }
      );
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: 'Promptly',
            submenu: [
              { label: 'Open Promptly', click: openWindow },
              {
                label: 'Settings…',
                accelerator: 'CommandOrControl+,',
                click: () => {
                  void lifecycle?.show('settings').catch(console.error);
                }
              },
              { type: 'separator' },
              { role: 'quit' }
            ]
          },
          { role: 'editMenu' }
        ])
      );
      nativeTheme.on('updated', updateWindowBackgrounds);
      openWindow();
      app.on('activate', () => {
        openWindow();
      });
    })
    .catch((error: unknown) => {
      console.error('Unable to initialize Promptly:', error);
      shutdown.fatal();
    });

app.on('before-quit', shutdown.beforeQuit);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
