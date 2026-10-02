import { randomUUID } from 'node:crypto';
import { open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

interface ExportFile {
  writeFile: (data: Uint8Array, options: { signal: AbortSignal }) => Promise<void>;
  sync: () => Promise<void>;
  close: () => Promise<void>;
}
export interface ExportFiles {
  open: (filename: string, flags: 'wx', mode: number) => Promise<ExportFile>;
  rename: (source: string, destination: string) => Promise<void>;
  unlink: (filename: string) => Promise<void>;
}

/** No destination is touched until a unique same-directory file is complete and flushed. */
export async function atomicExport(
  destination: string,
  data: Uint8Array,
  signal: AbortSignal,
  files: ExportFiles = { open, rename, unlink },
  validateDestination: () => Promise<void> = () => Promise.resolve()
): Promise<void> {
  const temporary = path.join(path.dirname(destination), `.promptly-export-${randomUUID()}.tmp`);
  let handle: ExportFile | undefined;
  let created = false;
  let committed = false;
  const failures: unknown[] = [];

  try {
    signal.throwIfAborted();
    handle = await files.open(temporary, 'wx', 0o600);
    created = true;
    await handle.writeFile(data, { signal });
    signal.throwIfAborted();
    await handle.sync();
    await handle.close();
    handle = undefined;
    signal.throwIfAborted();
    await validateDestination();
    signal.throwIfAborted();
    await files.rename(temporary, destination);
    committed = true;
  } catch (error) {
    failures.push(error);
  } finally {
    if (handle !== undefined)
      await handle.close().catch((error: unknown) => {
        failures.push(error);
      });
    if (created && !committed)
      await files.unlink(temporary).catch((error: unknown) => {
        failures.push(error);
      });
  }

  if (failures.length > 0) throw new AggregateError(failures, 'Unable to complete atomic export.');
}
