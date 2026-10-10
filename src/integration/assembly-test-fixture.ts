import { png } from '../main/attachments/png-test-fixture';
import { AttachmentService } from '../main/attachments/service';
import { CopyService } from '../main/copy/service';
import { storageCopyStatistics } from '../main/copy/storage-statistics';
import { LibraryMutations } from '../main/storage/library-mutations';
import type { StorageOperation, StorageRequest, StorageResponse } from '../main/storage/protocol';
import { testStorage } from '../main/storage/storage-test-fixture';
import { createDesktopWorkflows } from '../main/workflows/desktop-workflows';
import { createDesktopBridge } from '../preload/create-desktop-bridge';
import { operations } from '../shared/contracts/operations';
import type { DesktopResult } from '../shared/contracts/result';

export function assemblyFixture() {
  const store = testStorage();
  const mutations = new LibraryMutations();
  const clipboard: string[] = [];
  let alive = true;
  let activated = false;
  let retireOnSave = false;
  const listeners = new Set<() => void>();

  function closeOwner() {
    alive = false;
    for (const listener of [...listeners]) listener();
  }

  const storage = {
    call: <K extends StorageOperation>(name: K, input: StorageRequest<K>) => {
      const result = store.engine.run(1, name, input).result as DesktopResult<StorageResponse<K>>;

      if (retireOnSave && name === 'createQueueItem' && result.ok) closeOwner();
      return Promise.resolve(result);
    }
  };
  const owner = (id: number) =>
    id === 1
      ? {
          id,
          isAlive: () => alive,
          onClose: (listener: () => void) => {
            listeners.add(listener);
            return () => {
              listeners.delete(listener);
            };
          }
        }
      : undefined;
  const attachments = new AttachmentService(storage, mutations, {
    owner,
    choose: () => Promise.resolve([{ name: 'Owned image.png', mimeType: 'image/png', bytes: png }]),
    paste: () => Promise.resolve([]),
    raster: () => ({ png, width: 1, height: 1 }),
    copyPng: () => Promise.resolve(),
    save: () => Promise.resolve({ status: 'cancelled' })
  });
  const copy = new CopyService(storage, mutations, {
    platform: 'win32',
    owner,
    recordCopy: storageCopyStatistics(storage),
    writeText: (text) => {
      clipboard.push(text);
      return Promise.resolve();
    }
  });
  const {
    workflow,
    saves: save,
    services
  } = createDesktopWorkflows(
    storage,
    owner,
    { current: store.invoke('getSettings', {}) },
    copy,
    attachments,
    {
      returnToPreviousApp: () => {
        activated = true;
        return Promise.reject(new Error('Owned activation failure'));
      }
    }
  );
  const { bridge, dispose } = createDesktopBridge(
    {
      listen: () => () => undefined,
      invoke: (channel, request) => {
        const context = { senderId: 1 };

        if (channel === 'promptly:saveWorkflowDraft')
          return services.saveWorkflowDraft(
            operations.saveWorkflowDraft.request.parse(request),
            context
          );
        if (channel === 'promptly:prepareCopy')
          return services.prepareCopy(operations.prepareCopy.request.parse(request), context);
        if (channel === 'promptly:commitCopy')
          return services.commitCopy(operations.commitCopy.request.parse(request), context);
        return Promise.resolve({
          ok: false,
          error: { code: 'UNAVAILABLE', message: 'Owned transport is unavailable.' }
        });
      }
    },
    'win32'
  );

  return {
    store,
    clipboard,
    workflow,
    copy,
    save,
    attachments,
    storage,
    bridge,
    get activated() {
      return activated;
    },
    retireOnSave: () => {
      retireOnSave = true;
      activated = false;
    },
    dispose: async () => {
      dispose();
      await save.close();
      await workflow.close();
      await copy.close();
      await attachments.close();
      await mutations.close();
      store.dispose();
    }
  };
}
