import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { backupSchema } from '../../../shared/contracts/backup/format';
import type { DesktopResult } from '../../../shared/contracts/result';
import { resultSchema } from '../../../shared/contracts/result';
import type { StorageOperation, StorageRequest, StorageResponse } from '../protocol';
import { storageOperations } from '../protocol';
import { testStorage } from '../storage-test-fixture';

export function transferStore(now?: () => Date) {
  const store = testStorage(now);
  const file = path.join(path.dirname(store.filename), 'backup.json');

  return {
    ...store,
    get engine() {
      return store.engine;
    },
    file,
    export: () =>
      backupSchema.parse(
        JSON.parse(
          Buffer.from(store.invoke('exportLibraryData', { format: 'json' }).data).toString('utf8')
        )
      ),
    prepare: (backup: unknown) => {
      writeFileSync(file, JSON.stringify(backup));
      return store.invoke('prepareLibraryImport', { filename: file });
    },
    port: {
      call<K extends StorageOperation>(
        operation: K,
        input: StorageRequest<K>
      ): Promise<DesktopResult<StorageResponse<K>>> {
        return Promise.resolve(
          resultSchema<unknown>(storageOperations[operation].response).parse(
            store.engine.run(1, operation, input).result
          ) as DesktopResult<StorageResponse<K>>
        );
      }
    }
  };
}
