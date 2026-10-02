import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

/** Only the owned coordinator can yield; the target activates itself afterwards. */
export async function yieldOwnedFixture(directory: string, targetPid: number): Promise<void> {
  if (!Number.isInteger(targetPid) || targetPid < 1 || targetPid > 2147483647)
    throw new Error('Invalid owned cooperative target PID');
  const response = path.join(directory, 'yield.json');

  await rm(response, { force: true });
  const pending = path.join(directory, 'yield-request.pending');

  await writeFile(pending, String(targetPid));
  await rename(pending, path.join(directory, 'yield-request'));
  const deadline = performance.now() + 5000;

  while (performance.now() < deadline) {
    let text: string;

    try {
      text = await readFile(response, 'utf8');
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
      await delay(50);
      continue;
    }

    if (text === 'true') return;
    throw new Error('Owned coordinator did not yield activation');
  }

  throw new Error('Owned cooperative activation timed out');
}
