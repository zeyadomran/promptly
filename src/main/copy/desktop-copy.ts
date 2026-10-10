import { clipboard } from 'electron';

import type { PreviousAppService } from '../previous-app/service';
import type { SettingsService } from '../settings/service';
import type { StorageClient } from '../storage/client';
import type { LibraryMutations } from '../storage/library-mutations';
import type { TransferDialogs } from '../storage/transfer/native-dialogs';
import { CopyService } from './service';

export function createDesktopCopy(
  storage: StorageClient,
  mutations: LibraryMutations,
  dialogs: TransferDialogs,
  settings: SettingsService,
  previousApp: PreviousAppService
) {
  return new CopyService(storage, mutations, {
    platform: process.platform,
    owner: dialogs.owner,
    writeText: (text) => clipboard.writeText(text),
    variablesEnabled: () => settings.current.settings.promptVariables,
    returnToPreviousApp: () => previousApp.returnToPreviousApp()
  });
}
