import { createDesktopCapture } from './capture/desktop-capture';
import type { CaptureNative } from './capture/ports';
import { createDesktopCopy } from './copy/desktop-copy';
import { desktopPreviousApp } from './previous-app/desktop-previous-app';
import type { SettingsService } from './settings/service';
import type { createDesktopShortcuts } from './shortcuts/desktop-shortcuts';
import { snippetSourceServices } from './snippets/source-services';
import type { StorageClient } from './storage/client';
import { storageDesktopServices } from './storage/desktop-services';
import type { LibraryMutations } from './storage/library-mutations';
import type { TransferDialogs } from './storage/transfer/native-dialogs';
import { StorageTransfer } from './storage/transfer/service';
import type { WindowLifecycle } from './windows/window-lifecycle';

/** One mutation owner across capture, copy, CRUD, import and clear. */
export function createLibraryServices(
  storage: StorageClient,
  mutations: LibraryMutations,
  dialogs: TransferDialogs,
  settings: SettingsService,
  keyboard: ReturnType<typeof createDesktopShortcuts>,
  native: CaptureNative | undefined,
  lifecycle: () => WindowLifecycle | undefined = () => undefined
) {
  const capture = createDesktopCapture(storage, mutations, settings, keyboard, native);
  const transfer = new StorageTransfer(storage, mutations, dialogs, () => {
    capture.sources.clear();
  });
  const previousApp = desktopPreviousApp(native, settings, dialogs, lifecycle);
  const copy = createDesktopCopy(storage, mutations, dialogs, settings, previousApp.previous);

  return {
    capture,
    copy,
    previousApp: previousApp.previous,
    transfer,
    services: {
      ...storageDesktopServices(storage, mutations, (id) => {
        capture.sources.forget(id);
      }),
      ...snippetSourceServices(storage, capture.sources),
      ...capture.service.services,
      ...copy.services,
      ...previousApp.services,
      ...transfer.services
    }
  };
}
