import path from 'node:path';

import { app, ipcMain } from 'electron';

import { desktopConfirmation } from './capture-toast/desktop-confirmation';
import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { createLibraryServices } from './library-services';
import { ownApplication } from './lifecycle/application-startup';
import { closeDesktopResources } from './lifecycle/close-desktop-resources';
import { desktopRecovery } from './lifecycle/desktop-recovery';
import { createDesktopShutdown } from './lifecycle/desktop-shutdown';
import { installWindowOpenCommands } from './lifecycle/open-library-window';
import { warnStartupPreferences } from './lifecycle/preference-warning';
import { desktopOnboarding } from './onboarding/desktop-onboarding';
import { startWindowsSelection } from './platform/windows/desktop-selection';
import { desktopApplicationServices } from './settings/desktop-application-services';
import { electronSettingsControllers } from './settings/electron-controllers';
import { SettingsService } from './settings/service';
import { createDesktopShortcuts } from './shortcuts/desktop-shortcuts';
import { recorderServices, shortcutServices } from './shortcuts/ipc-services';
import type { StorageClient } from './storage/client';
import { desktopStorage } from './storage/desktop-storage';
import { LibraryMutations } from './storage/library-mutations';
import { nativeTransferDialogs } from './storage/transfer/native-dialogs';
import type { TrayCoordinator } from './tray/coordinator';
import { createDesktopTray } from './tray/desktop-tray';
import { trayUpdateAccess } from './tray/update-access';
import { createDesktopUpdates } from './updates/desktop-updates';
import { installDesktopAppearance } from './windows/desktop-appearance';
import { installLastWindowPolicy } from './windows/last-window-policy';
import { lifecycleServices } from './windows/lifecycle-services';
import { observeOrdinaryWindowClosure } from './windows/overlay-windows';
import { WindowLifecycle } from './windows/window-lifecycle';

let desktop: ReturnType<typeof installDesktopIpc> | undefined;
let storage: StorageClient | undefined;
let settings: SettingsService | undefined;
let lifecycle: WindowLifecycle | undefined;
let windowsSelection: ReturnType<typeof startWindowsSelection> | undefined;
let keyboard: ReturnType<typeof createDesktopShortcuts> | undefined;
let library: ReturnType<typeof createLibraryServices> | undefined;
let tray: TrayCoordinator | undefined;
let confirmation: ReturnType<typeof desktopConfirmation> | undefined;
let onboarding: ReturnType<typeof desktopOnboarding> | undefined;
let updates: ReturnType<typeof createDesktopUpdates> | undefined;
const mutations = new LibraryMutations();

observeOrdinaryWindowClosure();
const shutdown = createDesktopShutdown({
  cleanup: () =>
    closeDesktopResources({
      keyboard,
      library,
      confirmation,
      onboarding,
      lifecycle,
      settings,
      storage,
      tray,
      windowsSelection
    }),
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
const primaryInstance = ownApplication();
const recovery = desktopRecovery(() => {
  updates?.close();
  keyboard?.shortcuts.stopCommands();
  tray?.stopCommands();
  lifecycle?.stopCommands();
  desktop?.dispose();
}, shutdown.fatal);
const openWindow = installWindowOpenCommands(() => lifecycle, recovery);

if (primaryInstance)
  void app
    .whenReady()
    .then(async () => {
      windowsSelection = startWindowsSelection();

      storage = desktopStorage(
        (change) => {
          desktop?.publish(change);
          if (change.domains.includes('snippets')) tray?.changed();
          if (change.domains.includes('settings')) confirmation?.refreshPreferences();
        },
        () => {
          void recovery.storage();
        }
      );
      const revision = await storage.ready;

      if (recovery.isActive()) return;

      keyboard = createDesktopShortcuts(
        () => lifecycle,
        () => settings
      );
      tray = createDesktopTray(
        storage,
        keyboard.shortcuts,
        () => library?.copy,
        () => lifecycle,
        trayUpdateAccess(() => updates)
      );
      settings = new SettingsService(
        storage,
        electronSettingsControllers(undefined, keyboard.shortcuts.controller, tray.controller)
      );
      await settings.initialize();
      await warnStartupPreferences(settings, recovery);
      if (recovery.isActive()) return;
      const dialogs = nativeTransferDialogs(
        app.getPath('userData'),
        path.join(app.getPath('userData'), 'promptly.sqlite')
      );

      library = createLibraryServices(
        storage,
        mutations,
        dialogs,
        settings,
        keyboard,
        windowsSelection
      );
      confirmation = desktopConfirmation(library.capture.service, settings, () => lifecycle);
      onboarding = desktopOnboarding(
        library.capture.service,
        settings,
        dialogs.owner,
        () => lifecycle,
        keyboard.shortcuts
      );
      const recorders = recorderServices(keyboard.shortcuts);

      updates = createDesktopUpdates(
        () => desktop?.windows,
        () => lifecycle,
        () => tray?.changed()
      );
      desktop = installDesktopIpc(
        ipcMain,
        {
          ...library.services,
          ...updates.services,
          ...settings.services,
          ...desktopApplicationServices(),
          ...shortcutServices(keyboard.shortcuts, () => {
            tray?.changed();
          }),
          ...lifecycleServices(() => lifecycle)
        },
        revision,
        () => {
          if (settings === undefined) throw new Error('Preferences unavailable.');
          return settings.current;
        },
        (sender) => ({ ...recorders(sender), ...onboarding?.services(sender) })
      );
      lifecycle = new WindowLifecycle(
        desktop.windows,
        settings,
        {
          trayAvailable: () => tray?.available === true,
          trayControllerAvailable: () =>
            tray !== undefined && settings?.isUnavailable('showInTray') !== true,
          shortcutAvailable: () => keyboard?.shortcuts.recoveryAvailable === true
        },
        (error) => {
          console.error('Unable to update Promptly window:', error);
        }
      );
      await tray.refresh();
      installDesktopAppearance(openWindow, () => lifecycle);
      openWindow();
      updates.start();
    })
    .catch((error: unknown) => {
      void recovery.startup(error);
    });

app.on('before-quit', (event) => {
  updates?.close();
  recovery.close();
  keyboard?.shortcuts.stopCommands();
  tray?.stopCommands();
  lifecycle?.stopCommands();
  shutdown.beforeQuit(event);
});

installLastWindowPolicy(
  () => tray?.available === true || keyboard?.shortcuts.recoveryAvailable === true
);
