import type { DesktopResult } from '../../shared/contracts/result';
import { shortcutFixture } from '../shortcuts/shortcut-test-fixture';
import { LibraryMutations } from '../storage/library-mutations';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { testStorage } from '../storage/storage-test-fixture';
import { StorageTransfer } from '../storage/transfer/service';
import type { CaptureEvent, CaptureNative } from './ports';
import { CaptureService } from './service';
import { CaptureSources } from './sources';

export function captureFixture() {
  const store = testStorage();
  const mutations = new LibraryMutations();
  const shortcuts = shortcutFixture((callback) => callback).shortcuts;
  const identity = { token: 'a'.repeat(32), source: { pid: 1, name: 'Terminal', id: 'terminal' } };
  const os: {
    text: string;
    normalize: boolean;
    selected: Promise<void>;
    response: Promise<void>;
    failNative: boolean;
    selecting: boolean;
    integrity: number | null;
    activated: boolean;
  } = {
    text: '  ❯ echo 你好😀\r\n    $variable\r\n  > comparison\r\n  % formatting  ',
    normalize: true,
    selected: Promise.resolve(),
    response: Promise.resolve(),
    failNative: false,
    selecting: false,
    integrity: 8192,
    activated: false
  };
  let time = 0;
  const events: CaptureEvent[] = [];
  const native: CaptureNative = {
    foregroundIdentityResult: () => Promise.resolve({ status: 'ok', identity }),
    captureSelection: async () => {
      os.selecting = true;
      await os.selected;
      os.selecting = false;
      return os.failNative
        ? { v: 1, id: 'owned', status: 'unsupported' }
        : {
            v: 1,
            id: 'owned',
            status: 'ok',
            identity: identity.token,
            text: os.text,
            characterCount: os.text.length,
            source: identity.source,
            elapsedMs: 1,
            targetIntegrityLevel: os.integrity
          };
    },
    activateSource: (capability) => {
      os.activated = capability === identity;
      return Promise.resolve(os.activated ? 'ok' : 'foregroundChanged');
    }
  };
  const sources = new CaptureSources(native);
  const call = async <K extends StorageOperation>(name: K, input: StorageRequest<K>) => {
    const result = store.engine.run(1, name, input).result as DesktopResult<StorageResponse<K>>;

    if (name === 'captureSnippet') await os.response;
    return result;
  };

  const service = new CaptureService({ call }, mutations, {
    native,
    admit: () => shortcuts.captureAdmission(),
    normalize: () => os.normalize,
    now: () => ++time,
    remember: (id, capability) => {
      sources.remember(id, capability);
    }
  });

  const transfer = new StorageTransfer(
    { call },
    mutations,
    {
      directory: '',
      protectedFiles: [],
      owner: (id) => ({ id, isAlive: () => true, onClose: () => () => undefined }),
      open: () => Promise.resolve(undefined),
      save: () => Promise.resolve(undefined),
      reveal: () => undefined
    },
    () => {
      sources.clear();
    }
  );

  service.subscribe((event) => {
    events.push(event);
  });
  return { store, mutations, shortcuts, os, sources, transfer, service, events };
}
