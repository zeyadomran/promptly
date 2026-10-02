import path from 'node:path';

import { app, ipcMain, Menu, nativeTheme } from 'electron';

import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { closeSettingsStorage } from './lifecycle/close-settings-storage';
import { closeWindowResources } from './lifecycle/close-window-resources';
import { createQuitCoordinator } from './lifecycle/quit-coordinator';
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
const primaryInstance = app.requestSingleInstanceLock();

if (!primaryInstance) app.quit();
app.on('second-instance', () => {
  openWindow();
});

function openWindow(): void {
  void lifecycle?.show().catch((error: unknown) => {
    console.error('Unable to open Promptly:', error);
    app.exit(1);
  });
}

if (primaryInstance)
  void app
    .whenReady()
    .then(async () => {
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
      app.exit(1);
    });

app.on(
  'before-quit',
  createQuitCoordinator({
    cleanup: () => closeWindowResources(lifecycle, () => closeSettingsStorage(settings, storage)),
    onError: (error) => {
      console.error('Unable to close local storage:', error);
    },
    quit: () => {
      app.quit();
    }
  })
);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
