import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

/** A per-launch sidecar is a candidate only; exact fresh argv must still match. */
export async function retireSelectionOwner(
  executable: string,
  mode: string,
  directory: string,
  observe = async (candidate: number): Promise<string | undefined> => {
    try {
      const result = await promisify(execFile)(
        '/bin/ps',
        ['-ww', '-p', String(candidate), '-o', 'command='],
        { timeout: 200, maxBuffer: 4096 }
      );

      return result.stdout.trim();
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 1) return undefined;
      throw new Error('Owned selection fixture identity unavailable', { cause: error });
    }
  },
  signal: (pid: number, value: NodeJS.Signals) => void = (ownedPid, value) => {
    process.kill(ownedPid, value);
  }
) {
  const text = await readFile(path.join(directory, 'owner.pid'), 'utf8');

  if (!/^[1-9][0-9]{0,9}$/.test(text) || Number(text) > 2147483647)
    throw new Error('Invalid owned selection fixture PID');
  const pid = Number(text);
  const expected = `${executable} ${mode} ${directory}`;
  const identity = async () => {
    try {
      const command = await observe(pid);

      return command === undefined ? 'exited' : command === expected ? 'owned' : 'different';
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 1) return 'exited';
      throw new Error('Owned selection fixture identity unavailable', { cause: error });
    }
  };

  for (const value of ['SIGTERM', 'SIGKILL'] as const) {
    const current = await identity();

    if (current === 'exited') return;
    if (current !== 'owned') throw new Error('Owned selection fixture identity changed');
    try {
      signal(pid, value);
    } catch (error) {
      // A signal race is not proof: require a fresh exited observation as well.
      if ((await identity()) === 'exited') return;
      throw new Error('Owned selection fixture signal failed', { cause: error });
    }

    const deadline = performance.now() + 500;

    while (performance.now() < deadline) {
      const observed = await identity();

      if (observed === 'exited') return;
      if (observed !== 'owned') throw new Error('Owned selection fixture identity changed');
      await delay(20);
    }
  }

  throw new Error('Owned selection fixture termination was not observed');
}
