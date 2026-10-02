import { realpath } from 'node:fs/promises';
import path from 'node:path';

async function identity(filename: string): Promise<string> {
  const canonical = await realpath(filename).catch(async () =>
    path.join(await realpath(path.dirname(filename)), path.basename(filename))
  );

  return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
}

/** Export may replace a chosen backup, but cannot become an alternate library erase route. */
export async function validateExportDestination(
  filename: string,
  protectedFiles: readonly string[]
) {
  if (!path.isAbsolute(filename)) throw new Error('Native selection must be absolute.');
  const target = await identity(filename);

  for (const protectedFile of protectedFiles) {
    if (target === (await identity(protectedFile)))
      throw new Error('Cannot replace active storage.');
  }
}
