import { randomUUID } from 'node:crypto';
import { type FileHandle, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

/** Main retains exclusive ownership until the worker writer has settled or retired. */
export async function atomicExport(
  destination: string,
  write: (descriptor: number) => Promise<void>,
  signal: AbortSignal,
  validateDestination: () => Promise<void>
): Promise<void> {
  const temporary = path.join(path.dirname(destination), `.promptly-export-${randomUUID()}.tmp`);
  let committed = false;
  let handle: FileHandle | undefined;
  let created = false;
  const failures: unknown[] = [];

  try {
    signal.throwIfAborted();
    handle = await open(temporary, 'wx', 0o600);
    created = true;
    await write(handle.fd);
    signal.throwIfAborted();
    await handle.sync();
    await handle.close();
    handle = undefined;
    signal.throwIfAborted();
    await validateDestination();
    signal.throwIfAborted();
    await rename(temporary, destination);
    committed = true;
  } catch (error) {
    failures.push(error);
  } finally {
    if (handle !== undefined)
      await handle.close().catch((error: unknown) => {
        failures.push(error);
      });
    if (created && !committed)
      await unlink(temporary).catch((error: unknown) => {
        failures.push(error);
      });
  }

  if (failures.length > 0) throw new AggregateError(failures, 'Unable to complete atomic export.');
}
