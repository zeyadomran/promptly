import { LibraryMutations } from '../storage/library-mutations';
import { transferStore } from '../storage/transfer/transfer-test-fixture';
import { type CopyEffects, CopyService } from './service';

export function copyFixture<W extends CopyEffects['writeText'], H extends CopyEffects['hide']>(
  mocks: { writeText: W; hide: H },
  text = 'stored text'
) {
  const store = transferStore(() => new Date('2026-10-02T10:00:00.000Z'));
  const id = store.invoke('createSnippet', { text }).snippet.id;
  let alive = true;
  let retire: () => void = () => undefined;
  const owner = {
    id: 1,
    isAlive: () => alive,
    onClose: (listener: () => void) => {
      retire = listener;
      return () => {
        retire = () => undefined;
      };
    }
  };
  const mutations = new LibraryMutations();
  const settings = store.invoke('getSettings', {}).settings;
  const { writeText, hide } = mocks;
  const originalCall = store.port.call.bind(store.port);
  const service = new CopyService(store.port, mutations, {
    platform: 'win32',
    owner: (senderId) => (senderId === owner.id ? owner : undefined),
    settings: () => settings,
    writeText,
    hide
  });

  return {
    store,
    id,
    service,
    mutations,
    settings,
    writeText,
    hide,
    originalCall,
    copy: (format: 'text' | 'markdown' = 'text') =>
      service.services.copySnippet({ id, format }, { senderId: owner.id }),
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
