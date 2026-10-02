import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

/** Only owned booleans cross this test-only fixture file signal. */
export async function observeOwnedMacosForeground(directory: string, ownedPid: number) {
  if (!Number.isInteger(ownedPid) || ownedPid < 1 || ownedPid > 2147483647)
    throw new Error('Invalid owned foreground PID');
  const response = path.join(directory, 'foreground.json');

  await rm(response, { force: true });
  const pendingRequest = path.join(directory, 'foreground-request.pending');

  await writeFile(pendingRequest, String(ownedPid));
  await rename(pendingRequest, path.join(directory, 'foreground-request'));
  for (let attempt = 0; attempt < 100; attempt++) {
    let text: string;

    try {
      text = await readFile(response, 'utf8');
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
      await delay(100);
      continue;
    }

    try {
      const value: unknown = JSON.parse(text);

      if (
        typeof value === 'object' &&
        value !== null &&
        Object.keys(value).length === 2 &&
        'matched' in value &&
        typeof value.matched === 'boolean' &&
        'launchDateAvailable' in value &&
        typeof value.launchDateAvailable === 'boolean'
      )
        return { matched: value.matched, launchDateAvailable: value.launchDateAvailable };
    } catch {
      // Reject malformed data without reproducing its contents in error output.
    }

    throw new Error('Invalid owned foreground response');
  }

  throw new Error('Owned foreground observation timed out');
}
