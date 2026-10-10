import type { DesktopResult } from '../../shared/contracts/result';
import { LibraryMutations } from '../storage/library-mutations';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { testStorage } from '../storage/storage-test-fixture';
import type { TransferOwner } from '../storage/transfer/requests';
import { type CopyEffects, CopyService } from './service';

export function copyFixture(
  writeText: (text: string) => Promise<void>,
  text = 'stored text',
  extra: Partial<Pick<CopyEffects, 'returnToPreviousApp'>> = {}
) {
  const store = testStorage(() => new Date('2026-10-02T10:00:00.000Z'));
  const id = store.invoke('createSnippet', { text }).snippet.id;
  const settings = store.invoke('getSettings', {}).settings;
  const mutations = new LibraryMutations();
  let alive = true;
  let visible = true;
  let retire: () => void = () => undefined;
  // Retain the old window boundary to expose any regression that resumes hiding.
  const effects = {
    platform: 'win32',
    owner: (senderId: number): TransferOwner | undefined =>
      senderId !== 1
        ? undefined
        : {
            id: 1,
            isAlive: () => alive,
            onClose: (listener) => {
              retire = listener;
              return () => {
                retire = () => undefined;
              };
            }
          },
    settings: () => settings,
    writeText,
    variablesEnabled: () => settings.promptVariables,
    ...extra,
    hide: () => {
      visible = false;
      return Promise.resolve(true);
    }
  };
  const service = new CopyService(
    {
      call: <K extends StorageOperation>(name: K, input: StorageRequest<K>) =>
        Promise.resolve(
          store.engine.run(1, name, input).result as DesktopResult<StorageResponse<K>>
        )
    },
    mutations,
    effects
  );

  return {
    store,
    id,
    service,
    mutations,
    settings,
    visible: () => visible,
    copy: (format: 'text' | 'markdown' = 'text') =>
      service.services.copySnippet({ id, format }, { senderId: 1 }),
    retire: () => {
      alive = false;
      retire();
    },
    dispose: async () => {
      await service.close();
      await mutations.close();
      store.dispose();
    }
  };
}
