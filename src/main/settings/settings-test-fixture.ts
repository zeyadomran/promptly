import type { DesktopResult } from '../../shared/contracts/result';
import { resultSchema } from '../../shared/contracts/result';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { storageOperations } from '../storage/protocol';
import { testStorage } from '../storage/storage-test-fixture';
import type { SettingsControllers } from './controllers';
import { SettingsService } from './service';

export function testSettings(
  controllers: SettingsControllers = { available: [], unavailable: [] }
) {
  const store = testStorage();
  const storage = {
    call<K extends StorageOperation>(
      name: K,
      input: StorageRequest<K>
    ): Promise<DesktopResult<StorageResponse<K>>> {
      const reply = store.engine.run(1, name, input);

      return Promise.resolve(
        resultSchema(storageOperations[name].response).parse(reply.result) as DesktopResult<
          StorageResponse<K>
        >
      );
    }
  };

  return { store, service: new SettingsService(storage, controllers) };
}
