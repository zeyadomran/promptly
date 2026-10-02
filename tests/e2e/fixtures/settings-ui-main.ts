import path from 'node:path';

import { app, ipcMain, nativeTheme } from 'electron';

import { installDesktopIpc } from '../../../src/main/ipc/install-desktop-ipc';
import { closeLibraryResources } from '../../../src/main/lifecycle/close-library-resources';
import { closeSettingsStorage } from '../../../src/main/lifecycle/close-settings-storage';
import { closeWindowResources } from '../../../src/main/lifecycle/close-window-resources';
import { createDesktopShutdown } from '../../../src/main/lifecycle/desktop-shutdown';
import {
  electronSettingsControllers,
  updateWindowBackgrounds
} from '../../../src/main/settings/electron-controllers';
import { SettingsService } from '../../../src/main/settings/service';
import { StorageClient } from '../../../src/main/storage/client';
import { storageDesktopServices } from '../../../src/main/storage/desktop-services';
import { lifecycleServices } from '../../../src/main/windows/lifecycle-services';
import { WindowLifecycle } from '../../../src/main/windows/window-lifecycle';
import { hostedNativePreferences } from './settings-native-preferences';
import { ownedTransferServices } from './storage-transfer-services';

const profile = process.env['PROMPTLY_SETTINGS_UI_PROFILE'];

if (profile === undefined) throw new Error('Owned profile required.');
app.setPath('userData', profile);
const nativePreferences = hostedNativePreferences(profile);
let storage: StorageClient | undefined;
let settings: SettingsService | undefined;
let lifecycle: WindowLifecycle | undefined;
let library: ReturnType<typeof ownedTransferServices> | undefined;
let login = false;
let dock = true;
let rejectLogin = false;
let rejectDock = false;
const events: NodeJS.EventEmitter = app;

events.on('owned-settings-reject-login', (rejected: boolean) => {
  rejectLogin = rejected;
});
events.on('owned-settings-reject-dock', (rejected: boolean) => {
  rejectDock = rejected;
});
events.on('owned-settings-receipt', (reply: (receipt: object) => void) => {
  reply({
    login: nativePreferences.enabled ? app.getLoginItemSettings().openAtLogin : login,
    dock: nativePreferences.enabled
      ? process.platform === 'darwin' && (app.dock?.isVisible() ?? false)
      : dock,
    profile: app.getPath('userData')
  });
});
const shutdown = createDesktopShutdown({
  cleanup: async () => {
    const settled = await Promise.allSettled([
      closeLibraryResources(library?.transfer, () =>
        closeWindowResources(lifecycle, () => closeSettingsStorage(settings, storage))
      )
    ]);

    settled.push(...(await Promise.allSettled([nativePreferences.restore()])));
    const failures = settled.flatMap((result) =>
      result.status === 'rejected' ? [result.reason as unknown] : []
    );

    if (failures.length > 0) throw new AggregateError(failures, 'Owned fixture cleanup failed.');
  },
  onError: console.error,
  quit: () => {
    app.quit();
  },
  exit: (code) => {
    app.exit(code);
  }
});

void app
  .whenReady()
  .then(async () => {
    nativePreferences.capture();
    storage = new StorageClient(
      path.join(__dirname, 'storage-worker.cjs'),
      path.join(profile, 'settings.sqlite'),
      (change) => {
        desktop.publish(change);
      }
    );
    const revision = await storage.ready;

    settings = new SettingsService(
      storage,
      electronSettingsControllers(
        () => {
          lifecycle?.recoverVisibility();
        },
        nativePreferences.enabled
          ? undefined
          : {
              setLogin: (enabled) => {
                login = rejectLogin && enabled ? false : enabled;
              },
              getLogin: () => login,
              dock: {
                show: () => {
                  dock = !rejectDock;
                  return Promise.resolve();
                },
                hide: () => {
                  if (!rejectDock) dock = false;
                },
                isVisible: () => dock
              }
            }
      )
    );
    await settings.initialize();
    if (process.env['PROMPTLY_STORAGE_UI'] === '1')
      library = ownedTransferServices(storage, profile);
    const desktop = installDesktopIpc(
      ipcMain,
      {
        ...storageDesktopServices(storage, library?.mutations),
        ...library?.transfer.services,
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
        dockAvailable: () =>
          process.platform === 'darwin' &&
          (nativePreferences.enabled ? (app.dock?.isVisible() ?? false) : dock)
      },
      console.error
    );
    nativeTheme.on('updated', updateWindowBackgrounds);
    await lifecycle.show();
    await lifecycle.show('settings');
  })
  .catch(shutdown.fatal);
app.on('before-quit', shutdown.beforeQuit);
app.on('window-all-closed', () => {
  app.quit();
});
