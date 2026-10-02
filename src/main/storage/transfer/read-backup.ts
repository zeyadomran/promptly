import { closeSync, fstatSync, openSync, readSync, statSync } from 'node:fs';

import { backupLimits, backupSchema } from '../../../shared/contracts/backup/format';
import { StorageError } from '../context';

/** Runs inside the storage worker. Check actual bytes even if the file grows after stat. */
export function readBackup(filename: string) {
  if (!statSync(filename).isFile())
    throw new StorageError('INVALID_REQUEST', 'Choose a JSON file.');
  const descriptor = openSync(filename, 'r');

  try {
    if (!fstatSync(descriptor).isFile())
      throw new StorageError('INVALID_REQUEST', 'Choose a regular JSON file.');
    const chunks: Buffer[] = [];
    let total = 0;

    for (;;) {
      const chunk = Buffer.alloc(Math.min(64 * 1024, backupLimits.bytes + 1 - total));
      const bytes = readSync(descriptor, chunk, 0, chunk.length, null);

      if (bytes === 0) break;
      total += bytes;
      if (total > backupLimits.bytes)
        throw new StorageError('INVALID_REQUEST', 'Backup exceeds the 64 MiB limit.');
      chunks.push(chunk.subarray(0, bytes));
    }

    try {
      const json = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, total));

      return backupSchema.parse(JSON.parse(json));
    } catch (error) {
      throw new StorageError('INVALID_REQUEST', 'Invalid or unsupported Promptly backup.', {
        cause: error
      });
    }
  } finally {
    closeSync(descriptor);
  }
}
