import type { DesktopResult } from '../../../shared/contracts/result';
import type { StorageClient } from '../client';
import { atomicExport } from './atomic-export';
import { validateExportDestination } from './export-destination';

export async function exportLibraryFile(
  storage: Pick<StorageClient, 'call'>,
  filename: string,
  format: 'json' | 'markdown',
  signal: AbortSignal,
  protectedFiles: readonly string[]
): Promise<DesktopResult<{ revision: number }>> {
  await validateExportDestination(filename, protectedFiles);
  let revision = 0;
  let rejected: Extract<DesktopResult<unknown>, { ok: false }> | undefined;

  try {
    await atomicExport(
      filename,
      async (descriptor) => {
        const result = await storage.call('exportLibraryData', { format, descriptor });

        if (!result.ok) {
          rejected = result;
          throw new Error('Export rejected');
        }

        revision = result.value.revision;
      },
      signal,
      () => validateExportDestination(filename, protectedFiles)
    );
  } catch (error) {
    signal.throwIfAborted();
    if (rejected !== undefined) return rejected;
    throw error;
  }

  return { ok: true, value: { revision } };
}
