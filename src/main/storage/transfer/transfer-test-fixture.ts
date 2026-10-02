import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { backupSchema } from '../../../shared/contracts/backup/format';
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
    }
  };
}
