import path from 'node:path';

import { app } from 'electron';

import type { StorageClient } from '../../../src/main/storage/client';
import { LibraryMutations } from '../../../src/main/storage/library-mutations';
import { nativeTransferDialogs } from '../../../src/main/storage/transfer/native-dialogs';
import { StorageTransfer } from '../../../src/main/storage/transfer/service';

/** The owned UI lane substitutes only chooser/reveal UI; all selected paths stay main-owned. */
export function ownedTransferServices(storage: StorageClient, profile: string) {
  const mutations = new LibraryMutations();
  const native = nativeTransferDialogs(profile, path.join(profile, 'settings.sqlite'));
  let cancel = false;
  let invalid = false;
  let revealed = false;
  const events: NodeJS.EventEmitter = app;

  events.on('owned-transfer-choice', (choice: 'valid' | 'cancel' | 'invalid') => {
    cancel = choice === 'cancel';
    invalid = choice === 'invalid';
  });
  events.on('owned-transfer-reveal', (reply: (value: boolean) => void) => {
    reply(revealed);
  });
  const transfer = new StorageTransfer(storage, mutations, {
    ...native,
    save: (_owner, format) =>
      Promise.resolve(
        cancel ? undefined : path.join(profile, `export.${format === 'json' ? 'json' : 'md'}`)
      ),
    open: () =>
      Promise.resolve(
        cancel ? undefined : path.join(profile, invalid ? 'invalid.json' : 'export.json')
      ),
    reveal: () => {
      revealed = true;
    }
  });

  return { transfer, mutations };
}
