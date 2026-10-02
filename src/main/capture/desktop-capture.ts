import type { SettingsService } from '../settings/service';
import type { createDesktopShortcuts } from '../shortcuts/desktop-shortcuts';
import type { StorageClient } from '../storage/client';
import type { LibraryMutations } from '../storage/library-mutations';
import type { CaptureNative } from './ports';
import { CaptureService } from './service';
import { CaptureSources } from './sources';

export function createDesktopCapture(
  storage: StorageClient,
  mutations: LibraryMutations,
  settings: SettingsService,
  keyboard: ReturnType<typeof createDesktopShortcuts>,
  native: CaptureNative | undefined
) {
  const sources = new CaptureSources(native);
  const service = new CaptureService(storage, mutations, {
    native,
    admit: () => keyboard.shortcuts.captureAdmission(),
    normalize: () => settings.current.settings.normalizeWhitespace,
    remember: (id, identity) => {
      sources.remember(id, identity);
    }
  });
  const uninstall =
    native === undefined
      ? () => undefined
      : keyboard.capture.install(() => {
          const capture = service.prepareCapture();

          return async () => {
            await capture();
          };
        });

  return {
    service,
    sources,
    close: async () => {
      uninstall();
      await service.close();
      sources.clear();
    }
  };
}
