import { randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, openSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { PortableBackup } from '../../../shared/contracts/backup/format';
import { streamRecordSchema } from '../../../shared/contracts/backup/stream';
import { testStorage } from '../storage-test-fixture';
import { readLines } from './read-lines';

export function largeLegacyBackup(): PortableBackup {
  const createdAt = '2026-10-02T00:00:00.000Z';

  return {
    format: 'promptly-library',
    version: 1,
    tags: [],
    memberships: [],
    snippets: Array.from({ length: 7 }, () => ({
      id: randomUUID(),
      text: 'x'.repeat(1_000_000),
      createdAt,
      updatedAt: createdAt,
      lastCopiedAt: null,
      copyCount: 0
    }))
  };
}

export function collidingTagBackup(baseline: PortableBackup) {
  const first = randomUUID();
  const second = randomUUID();
  const tagA = randomUUID();
  const tagB = randomUUID();
  const createdAt = '2026-10-02T00:00:00.000Z';
  const backup: PortableBackup = {
    ...baseline,
    snippets: [first, second].map((id) => ({
      id,
      text: 'duplicate',
      createdAt,
      updatedAt: createdAt,
      lastCopiedAt: null,
      copyCount: 0
    })),
    tags: [
      { id: tagA, name: 'a\u0000b', color: 'blue', createdAt },
      { id: tagB, name: 'a\u0000c', color: 'blue', createdAt }
    ],
    memberships: [
      { snippetId: first, tagId: tagA },
      { snippetId: second, tagId: tagB }
    ]
  };

  return { first, backup };
}

export function transferStore(now?: () => Date) {
  const store = testStorage(now);
  const file = path.join(path.dirname(store.filename), 'backup.json');
  const exportFile = (format: 'json' | 'markdown' = 'json') => {
    const filename = path.join(
      path.dirname(store.filename),
      `${randomUUID()}.${format === 'json' ? 'jsonl' : 'md'}`
    );

    const descriptor = openSync(filename, 'wx', 0o600);

    try {
      store.invoke('exportLibraryData', { format, descriptor });
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }

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
