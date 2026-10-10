import type { desktopConfirmation } from '../capture-toast/desktop-confirmation';
import type { createLibraryServices } from '../library-services';
import type { desktopOnboarding } from '../onboarding/desktop-onboarding';
import type { WindowsSelection } from '../platform/windows/windows-selection';
import type { SettingsService } from '../settings/service';
import type { createDesktopShortcuts } from '../shortcuts/desktop-shortcuts';
import type { StorageClient } from '../storage/client';
import type { TrayCoordinator } from '../tray/coordinator';
import type { WindowLifecycle } from '../windows/window-lifecycle';
import { closeLibraryResources } from './close-library-resources';
import { closeNativeResources } from './close-native-resources';
import { closeSettingsStorage } from './close-settings-storage';
import { closeWindowResources } from './close-window-resources';

interface DesktopResources {
  keyboard: ReturnType<typeof createDesktopShortcuts> | undefined;
  library: ReturnType<typeof createLibraryServices> | undefined;
  confirmation: ReturnType<typeof desktopConfirmation> | undefined;
  onboarding: ReturnType<typeof desktopOnboarding> | undefined;
  lifecycle: WindowLifecycle | undefined;
  settings: SettingsService | undefined;
  storage: StorageClient | undefined;
  tray: TrayCoordinator | undefined;
  windowsSelection: WindowsSelection | undefined;
}

/** Retire commands now; drain writes/settings before disposing their native controllers/storage. */
export function closeDesktopResources(resources: DesktopResources): Promise<void> {
  const {
    keyboard,
    library,
    confirmation,
    onboarding,
    lifecycle,
    settings,
    storage,
    tray,
    windowsSelection
  } = resources;

  keyboard?.shortcuts.stopCommands();
  tray?.stopCommands();
  library?.previousApp.close();
  const confirmationClosing = confirmation?.close();

  return closeLibraryResources(
    [
      library?.capture,
      library?.attachments,
      library?.copy,
      library?.workflow,
      library?.workflowSave,
      library?.transfer,
      onboarding,
      { close: () => confirmationClosing ?? Promise.resolve() }
    ],
    () =>
      closeWindowResources(lifecycle, () =>
        closeSettingsStorage(
          settings,
          storage,
          {
            close: () =>
              closeNativeResources([
                keyboard,
                { close: () => windowsSelection?.dispose() ?? Promise.resolve() }
              ])
          },
          tray
        )
      )
  );
}
