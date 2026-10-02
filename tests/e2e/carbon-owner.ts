import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import { parseProbeChord, type ProbeChord } from './probe-chord';

type ObserveCommand = (pid: number) => Promise<string | undefined>;
async function command(pid: number): Promise<string | undefined> {
  try {
    const result = await promisify(execFile)(
      '/bin/ps',
      ['-ww', '-p', String(pid), '-o', 'command='],
      {
        timeout: 200,
        maxBuffer: 4096
      }
    );

    return result.stdout.trim();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 1) return undefined;
    throw new Error('Carbon owner identity unavailable', { cause: error });
  }
}

/** Fresh per-launch argv must identify the native owner before any fallback signal. */
export async function retireCarbonOwner(
  executable: string,
  directory: string,
  chord: ProbeChord,
  observe: ObserveCommand = command,
  signal: (pid: number, value: NodeJS.Signals) => void = (ownedPid, value) => {
    process.kill(ownedPid, value);
  }
) {
  const selected = parseProbeChord(chord);
  const text = await readFile(path.join(directory, 'owner.pid'), 'utf8').catch(() => '');

  if (!/^[1-9][0-9]{0,9}$/.test(text) || Number(text) > 2147483647)
    return { status: 'ownerUnavailable' };
  const pid = Number(text);
  const expected = `${executable} ${directory} ${selected}`;
  const identity = async () => {
    try {
      const actual = await observe(pid);

      return actual === undefined ? 'exited' : actual === expected ? 'owned' : 'identityChanged';
    } catch {
      return 'identityUnavailable';
    }
  };

  for (const value of ['SIGTERM', 'SIGKILL'] as const) {
    const state = await identity();

    if (state !== 'owned') return { status: state, pid };
    try {
      signal(pid, value);
    } catch {
      return { status: 'signalFailed', pid };
    }

    const deadline = performance.now() + 500;

    while (performance.now() < deadline) {
      const observed = await identity();

      if (observed !== 'owned') return { status: observed, pid };
      await delay(20);
    }
  }

  return { status: 'cleanupTimedOut', pid };
}
