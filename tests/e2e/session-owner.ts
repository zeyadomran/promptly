import { spawn } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { isHostedMacosProbe } from './carbon-hosted';
import { sessionLifetime } from './session-lifecycle';
import { decodeSessionState } from './session-state';

export async function createSessionOwner(executable: string) {
  if (!isHostedMacosProbe(process.platform, process.env))
    throw new Error('Session owner requires GitHub-hosted macOS');
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-session-sidecar-')));
  const child = spawn(await realpath(executable), [directory], { stdio: 'ignore' });
  const lifetime = sessionLifetime(child);
  let closing: Promise<Awaited<ReturnType<typeof lifetime.close>>> | undefined;

  async function state(phase: 'ready' | 'inspect' | 'final') {
    const deadline = performance.now() + 3000;

    while (performance.now() < deadline) {
      try {
        const filename = path.join(directory, `${phase}.json`);

        if ((await stat(filename)).size > 2048)
          throw new Error('Session receipt exceeded byte bound');
        const receipt = decodeSessionState(await readFile(filename, 'utf8'));

        if (receipt.pid !== child.pid || receipt.phase !== phase)
          throw new Error('Session receipt owner or phase mismatch');
        return receipt;
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
        if (lifetime.stopped())
          throw new Error('Owned session sidecar stopped before receipt', { cause: error });
      }

      await delay(25);
    }

    throw new Error('Owned session sidecar receipt timed out');
  }

  return {
    ready: () => state('ready'),
    inspect: async () => {
      await rm(path.join(directory, 'inspect.json'), { force: true });
      await writeFile(path.join(directory, 'inspect'), '');
      return state('inspect');
    },
    final: async () => {
      await writeFile(path.join(directory, 'stop'), '');
      return state('final');
    },
    close: () => {
      closing ??= (async () => {
        const observed = await lifetime.close(() => writeFile(path.join(directory, 'stop'), ''));

        await rm(directory, { recursive: true, force: true });
        return observed;
      })();
      return closing;
    }
  };
}
