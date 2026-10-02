import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron, type ElectronApplication, test } from '@playwright/test';

import { observeElectronStartup } from './electron-startup-receipt';
import { assertProfileIdentity } from './profile-identity';

let launchSequence = 0;

export class OwnedStartupError extends Error {
  constructor(readonly receipt: object) {
    super(`Owned Electron startup failed: ${JSON.stringify(receipt)}`);
  }
}

/** Actual production main/worker, with a fresh profile; never opens the user's DB. */
export async function launchIsolatedElectron(
  executablePath: string,
  env: Record<string, string>,
  prepare?: (ownedProfile: string) => void | Promise<void>
) {
  // Electron/Chromium can canonicalize /var to /private/var on macOS.
  const profile = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-smoke-profile-')));
  const started = performance.now();
  const sequence = ++launchSequence;
  let application: ElectronApplication | undefined;
  let observation: ReturnType<typeof observeElectronStartup> | undefined;
  let stage = 'profile-setup';

  async function save(status: string) {
    const receipt = {
      status,
      stage,
      ...observation?.snapshot(),
      elapsedMs: performance.now() - started
    };
    const output = test.info().outputPath(`electron-startup-${String(sequence)}.json`);

    console.log(`Owned Electron lifecycle: ${JSON.stringify(receipt)}`);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(receipt), 'utf8');
    await test.info().attach(`electron-startup-${String(sequence)}`, {
      path: output,
      contentType: 'application/json'
    });
    return receipt;
  }

  async function release() {
    try {
      await application?.close();
    } finally {
      await rm(profile, { recursive: true, force: true });
    }
  }

  try {
    await prepare?.(profile);
    stage = 'electron-launch';
    application = await electron.launch({
      executablePath,
      env,
      args: [`--user-data-dir=${profile}`],
      timeout: 20_000
    });
    observation = observeElectronStartup(application.process(), started);
    observation.stage('launched');
    stage = 'first-window';
    await application.firstWindow({ timeout: 20_000 });
    observation.stage('first-window');
    stage = 'profile-identity';
    const actual = await application.evaluate(({ app }) => app.getPath('userData'));

    const receipt = await assertProfileIdentity(actual, profile);

    console.log(`Packaged profile isolation: ${JSON.stringify(receipt)}`);
    stage = 'ready';
    await save('ready');
  } catch (error) {
    const status = error instanceof Error && error.name === 'TimeoutError' ? 'timedOut' : 'failed';

    try {
      await release();
    } catch {
      observation?.stage('cleanup-failed');
    }

    try {
      throw new OwnedStartupError(await save(status));
    } finally {
      observation?.detach();
    }
  }

  return {
    application,
    dispose: async () => {
      try {
        await release();
        observation.stage('closed');
        return await save('closed');
      } catch (error) {
        observation.stage('cleanup-failed');
        await save('cleanupFailed');
        throw error;
      } finally {
        observation.detach();
      }
    }
  };
}
