import type { DesktopResult } from '../../shared/contracts/result';
import { resultSchema } from '../../shared/contracts/result';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { storageOperations } from '../storage/protocol';
import { testStorage } from '../storage/storage-test-fixture';
import type { SettingsControllers } from './controllers';
import { SettingsService } from './service';

export function seedLegacyShortcutProfile(store: ReturnType<typeof testStorage>): void {
  const database = store.engine.context.db;
  const write = database.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const [key, value] of [
    ['showDockIcon', 'false'],
    ['openShortcut', '"Control+F"'],
    ['pinShortcut', '"Control+T"']
  ] as const)
    write.run(key, value);
  write.run('localShortcuts', JSON.stringify({ copy: 'Control+K', deleteAlternate: null }));
}

export function testSettings(
  controllers: SettingsControllers = { available: [], unavailable: [] },
  now?: () => Date,
  wait?: (name: StorageOperation) => Promise<void>
) {
  const store = testStorage(now);
  const storage = {
    async call<K extends StorageOperation>(
      name: K,
      input: StorageRequest<K>
    ): Promise<DesktopResult<StorageResponse<K>>> {
      if (wait !== undefined) await wait(name);
      const reply = store.engine.run(1, name, input);

      return Promise.resolve(
        resultSchema<unknown>(storageOperations[name].response).parse(
          reply.result
        ) as DesktopResult<StorageResponse<K>>
      );
    }
  };

  return { store, storage, service: new SettingsService(storage, controllers) };
}
