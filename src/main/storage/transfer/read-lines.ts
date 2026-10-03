import { readSync } from 'node:fs';

import { streamLineBytes } from '../../../shared/contracts/backup/stream';
import { StorageError } from '../context';

/** Fatal UTF-8 decoding and a bound on one JSON record, independent of file size. */
export function* readLines(descriptor: number) {
  const chunk = Buffer.alloc(64 * 1024);
  let segments: Buffer[] = [];
  let length = 0;
  const decoder = new TextDecoder('utf8', { fatal: true });

  for (;;) {
    const bytes = readSync(descriptor, chunk);

    if (bytes === 0) break;
    let start = 0;

    for (let index = 0; index < bytes; index++) {
      if (chunk[index] !== 10) continue;
      const segment = Buffer.from(chunk.subarray(start, index));

      length += segment.length;
      if (length > streamLineBytes)
        throw new StorageError(
          'INVALID_REQUEST',
          'A backup record exceeds the supported snippet size.'
        );
      segments.push(segment);
      yield decoder.decode(Buffer.concat(segments, length));
      segments = [];
      length = 0;
      start = index + 1;
    }

    if (start < bytes) {
      const segment = Buffer.from(chunk.subarray(start, bytes));

      length += segment.length;
      if (length > streamLineBytes)
        throw new StorageError(
          'INVALID_REQUEST',
          'A backup record exceeds the supported snippet size.'
        );
      segments.push(segment);
    }
  }

  if (length !== 0) yield decoder.decode(Buffer.concat(segments, length));
}
