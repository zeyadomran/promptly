import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const execute = promisify(execFile);

/** A PID sidecar is only a candidate; the fresh per-launch argv must match before signals. */
export async function closeMacosOwner(bundle, mode, readyFile, dependencies = {}) {
  const observe = dependencies.execute ?? execute;
  const signalPid = dependencies.kill ?? process.kill;
  let pid;

  try {
    const text = await readFile(`${readyFile}.pid`, 'utf8');

    if (!/^[1-9][0-9]{0,9}$/.test(text)) return { status: 'ownerUnavailable' };
    pid = Number(text);
    if (pid > 2147483647) return { status: 'ownerUnavailable' };
  } catch (error) {
    return { status: error.code === 'ENOENT' ? 'ownerUnavailable' : 'ownerReadFailed' };
  }

  const expected = `${path.join(bundle, 'Contents/MacOS/promptly-native')} --fixture ${mode} ${readyFile}`;

  async function identity() {
    try {
      const { stdout } = await observe('/bin/ps', ['-ww', '-p', String(pid), '-o', 'command='], {
        timeout: 200,
        maxBuffer: 4096
      });

      return stdout.trim() === expected ? 'owned' : 'identityChanged';
    } catch (error) {
      return error.code === 1 ? 'exited' : 'identityUnavailable';
    }
  }

  for (const signal of ['SIGTERM', 'SIGKILL']) {
    const state = await identity();

    if (state !== 'owned') return { pid, status: state };
    try {
      signalPid(pid, signal);
    } catch (error) {
      return { pid, status: error.code === 'ESRCH' ? 'exited' : 'signalFailed' };
    }

    const deadline = performance.now() + 500;

    while (performance.now() < deadline) {
      const observed = await identity();

      if (observed !== 'owned') return { pid, status: observed };
      await delay(20);
    }
  }

  return { pid, status: 'cleanupTimedOut' };
}
