import { clipboard } from 'electron';

import type { SettingsService } from '../settings/service';
import type { StorageClient } from '../storage/client';
import type { LibraryMutations } from '../storage/library-mutations';
import type { TransferDialogs } from '../storage/transfer/native-dialogs';
import type { WindowLifecycle } from '../windows/window-lifecycle';
import { CopyService } from './service';

export function createDesktopCopy(
  storage: StorageClient,
  mutations: LibraryMutations,
  dialogs: TransferDialogs,
  settings: SettingsService,
  lifecycle: () => WindowLifecycle | undefined
) {
  return new CopyService(storage, mutations, {
    platform: process.platform,
    owner: dialogs.owner,
    writeText: (text) => clipboard.writeText(text),
    settings: () => settings.current.settings,
    hide: (owner) => lifecycle()?.hideAfterCopy(owner.id) ?? Promise.resolve(false)
  });
}
