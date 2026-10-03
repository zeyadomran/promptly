import { readSync } from 'node:fs';

import { backupLimits, backupSchema } from '../../../shared/contracts/backup/format';
import { StorageError } from '../context';

/** Legacy v1 retains its bounded whole-document parser. New exports use streaming v2. */
export function readBackup(descriptor: number) {
  const chunks: Buffer[] = [];
  let total = 0;

  for (;;) {
    const chunk = Buffer.alloc(Math.min(64 * 1024, backupLimits.bytes + 1 - total));
    const bytes = readSync(descriptor, chunk, 0, chunk.length, total);

    if (bytes === 0) break;
    total += bytes;
    if (total > backupLimits.bytes)
      throw new StorageError(
        'INVALID_REQUEST',
        'Legacy JSON backup exceeds 64 MiB. Use a Promptly v2 JSON Lines backup for larger libraries.'
      );
    chunks.push(chunk.subarray(0, bytes));
  }

  const json = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, total));

  return backupSchema.parse(JSON.parse(json));
}
