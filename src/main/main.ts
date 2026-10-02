import path from 'node:path';

import { app, ipcMain, nativeTheme } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';

import { desktopConfirmation } from './capture-toast/desktop-confirmation';
import { installDesktopIpc } from './ipc/install-desktop-ipc';
import { createLibraryServices } from './library-services';
import { closeDesktopResources } from './lifecycle/close-desktop-resources';
import { createDesktopShutdown } from './lifecycle/desktop-shutdown';
import { desktopOnboarding } from './onboarding/desktop-onboarding';
import {
  observeSelectionStartup,
  selectionLaunchOptions
} from './platform/native/selection-options';
import type { WindowsSelection } from './platform/windows/windows-selection';
import { createWindowsSelection } from './platform/windows/windows-selection';
import {
  electronSettingsControllers,
  updateWindowBackgrounds
} from './settings/electron-controllers';
import { SettingsService } from './settings/service';
import { createDesktopShortcuts } from './shortcuts/desktop-shortcuts';
import { recorderServices, shortcutServices } from './shortcuts/ipc-services';
import { StorageClient } from './storage/client';
import { LibraryMutations } from './storage/library-mutations';
import { nativeTransferDialogs } from './storage/transfer/native-dialogs';
import type { TrayCoordinator } from './tray/coordinator';
import { createDesktopTray } from './tray/desktop-tray';
import { installDesktopMenu } from './windows/desktop-menu';
import { lifecycleServices } from './windows/lifecycle-services';
import { observeOrdinaryWindowClosure } from './windows/overlay-windows';
import { WindowLifecycle } from './windows/window-lifecycle';

let desktop: ReturnType<typeof installDesktopIpc>;
let storage: StorageClient | undefined;
let settings: SettingsService | undefined;
let lifecycle: WindowLifecycle | undefined;
let windowsSelection: WindowsSelection | undefined;
let keyboard: ReturnType<typeof createDesktopShortcuts> | undefined;
let library: ReturnType<typeof createLibraryServices> | undefined;
let tray: TrayCoordinator | undefined;
let confirmation: ReturnType<typeof desktopConfirmation> | undefined;
let onboarding: ReturnType<typeof desktopOnboarding> | undefined;
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
const supported = process.platform === 'win32' && process.arch === 'x64';

if (supported) app.setAppUserModelId('com.squirrel.Promptly.Promptly');
const primaryInstance = supported && !squirrelStartup && app.requestSingleInstanceLock();

if (!supported) {
  console.error('Promptly supports Windows x64 only.');
  app.exit(1);
}

// The standard handler owns setup-event shortcut completion and exit; never initialize desktop effects.
if (!primaryInstance && !squirrelStartup) app.quit();
app.on('second-instance', () => {
  openWindow();
});

function openWindow(): void {
  void (async () => {
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
      windowsSelection = createWindowsSelection(selectionLaunchOptions());
      observeSelectionStartup(windowsSelection.ready(), 'Windows');

      storage = new StorageClient(
        path.join(__dirname, 'storage-worker.cjs'),
        path.join(app.getPath('userData'), 'promptly.sqlite'),
        (change) => {
          desktop.publish(change);
          if (change.domains.includes('snippets')) tray?.changed();
          if (change.domains.includes('settings')) confirmation?.refreshPreferences();
        }
      );
      const revision = await storage.ready;

      keyboard = createDesktopShortcuts(
        () => lifecycle,
        () => settings
      );
      tray = createDesktopTray(
        storage,
        keyboard.shortcuts,
        () => library?.copy,
        () => lifecycle
      );
      settings = new SettingsService(
        storage,
        electronSettingsControllers(undefined, keyboard.shortcuts.controller, tray.controller)
      );
      await settings.initialize();
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
        windowsSelection,
        () => lifecycle
      );
      confirmation = desktopConfirmation(library.capture.service, settings);
      onboarding = desktopOnboarding(
        library.capture.service,
        settings,
        dialogs.owner,
        () => lifecycle
      );
      const recorders = recorderServices(keyboard.shortcuts);

      desktop = installDesktopIpc(
        ipcMain,
        {
          ...library.services,
          ...settings.services,
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
          trayControllerAvailable: () => tray !== undefined,
          shortcutAvailable: () => keyboard?.shortcuts.recoveryAvailable === true
        },
        (error) => {
          console.error('Unable to save window geometry:', error);
        }
      );
      await tray.refresh();
      installDesktopMenu(openWindow, () => lifecycle);
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

app.on('before-quit', (event) => {
  keyboard?.shortcuts.stopCommands();
  tray?.stopCommands();
  shutdown.beforeQuit(event);
});

app.on('window-all-closed', () => {
  if (tray?.available !== true && keyboard?.shortcuts.recoveryAvailable !== true) app.quit();
});
