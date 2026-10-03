import { randomUUID } from 'node:crypto';
import { rename, unlink } from 'node:fs/promises';
import path from 'node:path';

/** The writer exclusively creates and flushes this same-directory temporary file. */
export async function atomicExport(
  destination: string,
  write: (temporary: string) => Promise<void>,
  signal: AbortSignal,
  validateDestination: () => Promise<void>
): Promise<void> {
  const temporary = path.join(path.dirname(destination), `.promptly-export-${randomUUID()}.tmp`);
  let committed = false;

  try {
    signal.throwIfAborted();
    await write(temporary);
    signal.throwIfAborted();
    await validateDestination();
    signal.throwIfAborted();
    await rename(temporary, destination);
    committed = true;
  } finally {
    if (!committed)
      await unlink(temporary).catch((error: unknown) => {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      });
  }
}
