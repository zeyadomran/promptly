import type { DesktopResult } from '../../shared/contracts/result';
import { CopyService } from '../copy/service';
import { LibraryMutations } from '../storage/library-mutations';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { testStorage } from '../storage/storage-test-fixture';
import type { TransferOwner } from '../storage/transfer/requests';
import type { WorkflowContent } from './ports';
import { WorkflowCopyService } from './service';

export function workflowFixture() {
  const store = testStorage();
  const mutations = new LibraryMutations();
  const clipboard: string[] = [];
  let alive = true;
  let now = 0;
  let rejectClipboard = false;
  const listeners = new Set<() => void>();
  const owner: TransferOwner = {
    id: 1,
    isAlive: () => alive,
    onClose: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
  const lookup = (source: {
    kind: 'snippet' | 'queue';
    id: string;
  }): Promise<DesktopResult<WorkflowContent>> => {
    const result = store.engine.run(1, 'getSnippet', { id: source.id }).result;

    if (!result.ok) return Promise.resolve(result);
    const snippet = store.invoke('getSnippet', { id: source.id }).snippet;

    return Promise.resolve({
      ok: true,
      value: {
        kind: source.kind,
        id: snippet.id,
        text: snippet.text,
        tags: snippet.tags,
        attachments: []
      }
    });
  };

  const copy = new CopyService(
    {
      call: <K extends StorageOperation>(name: K, input: StorageRequest<K>) =>
        Promise.resolve(
          store.engine.run(1, name, input).result as DesktopResult<StorageResponse<K>>
        )
    },
    mutations,
    {
      platform: 'win32',
      owner: (id) => (id === 1 ? owner : undefined),
      writeText: (text) => {
        if (rejectClipboard) return Promise.reject(new Error('Owned clipboard failure'));
        clipboard.push(text);
        return Promise.resolve();
      }
    }
  );
  const service = new WorkflowCopyService({
    owner: (id) => (id === 1 ? owner : undefined),
    lookup,
    variablesEnabled: () => true,
    executePrepared: (context, resolve) => copy.executePrepared(context, resolve),
    now: () => now
  });

  return {
    store,
    service,
    mutations,
    clipboard,
    tick: () => {
      now += 300_001;
    },
    rejectClipboard: (value: boolean) => {
      rejectClipboard = value;
    },
    retire: () => {
      alive = false;
      for (const listener of listeners) listener();
    },
    dispose: async () => {
      await service.close();
      await copy.close();
      await mutations.close();
      store.dispose();
    }
  };
}
