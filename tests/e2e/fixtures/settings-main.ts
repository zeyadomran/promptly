import path from 'node:path';

import { app, ipcMain, nativeTheme } from 'electron';

import { installDesktopIpc } from '../../../src/main/ipc/install-desktop-ipc';
import { closeSettingsStorage } from '../../../src/main/lifecycle/close-settings-storage';
import { createQuitCoordinator } from '../../../src/main/lifecycle/quit-coordinator';
import {
  electronSettingsControllers,
  updateWindowBackgrounds
} from '../../../src/main/settings/electron-controllers';
import { SettingsService } from '../../../src/main/settings/service';
import { StorageClient } from '../../../src/main/storage/client';
import { storageDesktopServices } from '../../../src/main/storage/desktop-services';
import { createMainWindow } from '../../../src/main/windows/create-main-window';

let storage: StorageClient | undefined;
let settings: SettingsService | undefined;

void app.whenReady().then(async () => {
  const filename = process.env['PROMPTLY_SETTINGS_FIXTURE_DATABASE'];

  if (filename === undefined) throw new Error('Test database is required.');
  storage = new StorageClient(
    path.resolve('.vite/build/storage-worker.cjs'),
    filename,
    (change) => {
      desktop.publish(change);
    }
  );
  const revision = await storage.ready;
  const controllers = electronSettingsControllers();

  settings = new SettingsService(storage, {
    unavailable: controllers.unavailable,
    // Exercise real theme/pin without changing this machine's login or dock configuration.
    available: [
      ...controllers.available.filter(
        (controller) => controller.name === 'theme' || controller.name === 'pin'
      ),
      {
        name: 'test native operation',
        keys: ['onboardingComplete'],
        apply: (preferences) => {
          if (preferences.onboardingComplete) throw new Error('Injected native failure');
          return Promise.resolve();
        }
      }
    ]
  });
  await settings.initialize();
  const desktop = installDesktopIpc(
    ipcMain,
    { ...storageDesktopServices(storage), ...settings.services },
    revision,
    () => {
      if (settings === undefined) throw new Error('Missing preferences.');
      return settings.current;
    }
  );

  nativeTheme.on('updated', updateWindowBackgrounds);
  for (const role of ['main', 'settings', 'toast']) {
    const window = await createMainWindow(desktop.windows, settings.current);

    window.setTitle(`Promptly ${role} fixture`);
  }
});
app.on('window-all-closed', () => {
  app.quit();
});
app.on(
  'before-quit',
  createQuitCoordinator({
    cleanup: () => closeSettingsStorage(settings, storage),
    onError: (error) => {
      console.error('Unable to close test preferences:', error);
    },
    quit: () => {
      app.quit();
    }
  })
);
