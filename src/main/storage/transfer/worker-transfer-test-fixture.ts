import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { StorageClient } from '../client';
import { exportLibraryFile } from './export-request';

/** Production worker/main streaming seam against an exclusively owned test database. */
export async function workerExportFile(
  databaseFile: string,
  buildWorker: (directory: string) => Promise<void>
) {
  const directory = path.dirname(databaseFile);

  await buildWorker(directory);
  const client = new StorageClient(path.join(directory, 'export-worker.cjs'), databaseFile);
  const filename = path.join(directory, `${randomUUID()}.jsonl`);

  try {
    const result = await exportLibraryFile(client, filename, 'json', new AbortController().signal, [
      databaseFile,
      `${databaseFile}-wal`,
      `${databaseFile}-shm`
    ]);

    if (!result.ok) throw new Error(result.error.message);
    return filename;
  } finally {
    await client.close();
  }
}
