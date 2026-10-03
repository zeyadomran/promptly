import { randomUUID } from 'node:crypto';
import { closeSync, openSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { PortableBackup } from '../../../shared/contracts/backup/format';
import { streamRecordSchema } from '../../../shared/contracts/backup/stream';
import { testStorage } from '../storage-test-fixture';
import { readLines } from './read-lines';

export function transferStore(now?: () => Date) {
  const store = testStorage(now);
  const file = path.join(path.dirname(store.filename), 'backup.json');
  const exportFile = (format: 'json' | 'markdown' = 'json') => {
    const filename = path.join(
      path.dirname(store.filename),
      `${randomUUID()}.${format === 'json' ? 'jsonl' : 'md'}`
    );

    store.invoke('exportLibraryData', { format, filename });
    return filename;
  };

  return {
    ...store,
    get engine() {
      return store.engine;
    },
    file,
    exportFile,
    // Small fixture snapshots only. Production export/restore never collects the library.
    export: (): PortableBackup => {
      const backup: PortableBackup = {
        format: 'promptly-library',
        version: 1,
        snippets: [],
        tags: [],
        memberships: []
      };
      const descriptor = openSync(exportFile(), 'r');

      try {
        const lines = readLines(descriptor);

        lines.next();
        for (const line of lines) {
          const parsed: unknown = JSON.parse(line);
          const record = streamRecordSchema.safeParse(parsed);

          if (!record.success) continue;
          if (record.data.type === 'snippet') backup.snippets.push(record.data.value);
          else if (record.data.type === 'tag') backup.tags.push(record.data.value);
          else backup.memberships.push(record.data.value);
        }

        return backup;
      } finally {
        closeSync(descriptor);
      }
    },
    prepareFile: (filename: string) => store.invoke('prepareLibraryImport', { filename }),
    prepare: (backup: unknown) => {
      writeFileSync(file, JSON.stringify(backup));
      return store.invoke('prepareLibraryImport', { filename: file });
    }
  };
}
