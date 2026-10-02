import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import type { buildCarbonControl } from './build-carbon-control';
import { isHostedMacosProbe } from './carbon-hosted';
import { retireCarbonOwner } from './carbon-owner';
import { decodeCarbonState } from './carbon-state';
import { parseProbeChord, type ProbeChord, probeDriverAction } from './probe-chord';

const execute = promisify(execFile);

export async function launchCarbonControl(
  built: Awaited<ReturnType<typeof buildCarbonControl>>,
  chord: ProbeChord = 'ctrl-option-f11'
) {
  if (!isHostedMacosProbe(process.platform, process.env))
    throw new Error('Carbon input probe requires hosted macOS');
  const { bundle, executable, driver } = built;
  const selected = parseProbeChord(chord);
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-carbon-control-')));
  const nativeExecutable = await realpath(executable);
  const child = spawn(
    '/usr/bin/open',
    ['-W', '-n', await realpath(bundle), '--args', directory, selected],
    {
      stdio: 'ignore'
    }
  );
  let exitCode: number | null | undefined;
  let failed = false;
  const closed = new Promise<void>((resolve) => {
    child.once('error', () => {
      failed = true;
    });
    child.once('close', (code) => {
      exitCode = code;
      resolve();
    });
  });

  async function state(phase: 'ready' | 'final') {
    const deadline = performance.now() + 10_000;

    while (performance.now() < deadline) {
      try {
        const filename = path.join(directory, `${phase}.json`);

        if ((await stat(filename)).size > 4096)
          throw new Error('Carbon receipt exceeded byte bound');
        const receipt = decodeCarbonState(await readFile(filename, 'utf8'));
        const ownerPid = await readFile(path.join(directory, 'owner.pid'), 'utf8');

        if (
          receipt.phase !== phase ||
          String(receipt.pid) !== ownerPid ||
          receipt.chord !== selected
        )
          throw new Error('Carbon receipt owner or phase mismatch');
        return receipt;
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
        if (exitCode !== undefined || failed)
          throw new Error('Carbon control stopped before receipt', { cause: error });
      }

      await delay(50);
    }

    throw new Error('Carbon control receipt timed out');
  }

  async function close() {
    await Promise.race([closed, delay(6000)]);
    const owner = await retireCarbonOwner(nativeExecutable, directory);

    if (exitCode === undefined) child.kill();
    await Promise.race([closed, delay(1000)]);
    if (owner.status !== 'exited')
      throw new Error(`Carbon control cleanup unverified (${owner.status})`);
    await rm(directory, { recursive: true, force: true });
    if (failed || exitCode !== 0) throw new Error('Carbon control launcher failed');
    return { owner, launcherExitCode: exitCode };
  }

  return {
    ready: () => state('ready'),
    close,
    final: () => state('final'),
    send: async (ownedPid: number) => {
      const result = await execute(driver, [String(ownedPid), probeDriverAction(selected)], {
        timeout: 3000,
        maxBuffer: 4096
      });

      return result.stdout.trim();
    }
  };
}
