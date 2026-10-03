import { clipboard } from 'electron';

import type { StorageClient } from '../storage/client';
import type { LibraryMutations } from '../storage/library-mutations';
import type { TransferDialogs } from '../storage/transfer/native-dialogs';
import { CopyService } from './service';

export function createDesktopCopy(
  storage: StorageClient,
  mutations: LibraryMutations,
  dialogs: TransferDialogs
) {
  return new CopyService(storage, mutations, {
    platform: process.platform,
    owner: dialogs.owner,
    writeText: (text) => clipboard.writeText(text)
  });
}
