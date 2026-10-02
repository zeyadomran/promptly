import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron } from '@playwright/test';

import { assertProfileIdentity } from './profile-identity';

/** Actual production main/worker, with a fresh profile; never opens the user's DB. */
export async function launchIsolatedElectron(executablePath: string, env: Record<string, string>) {
  // Electron/Chromium can canonicalize /var to /private/var on macOS.
  const profile = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-smoke-profile-')));
  let application = await electron.launch({
    executablePath,
    env,
    args: [`--user-data-dir=${profile}`],
    timeout: 20_000
  });

  try {
    await application.firstWindow();
    const actual = await application.evaluate(({ app }) => app.getPath('userData'));

    const receipt = await assertProfileIdentity(actual, profile);

    console.log(`Packaged profile isolation: ${JSON.stringify(receipt)}`);
  } catch (error) {
    await application.close();
    await rm(profile, { recursive: true, force: true });
    throw error;
  }

  return {
    get application() {
      return application;
    },
    profile,
    restart: async () => {
      await application.close();
      application = await electron.launch({
        executablePath,
        env,
        args: [`--user-data-dir=${profile}`],
        timeout: 20_000
      });
      await application.firstWindow();
      await assertProfileIdentity(
        await application.evaluate(({ app }) => app.getPath('userData')),
        profile
      );
      return application;
    },
    dispose: async () => {
      try {
        await application.close();
      } finally {
        await rm(profile, { recursive: true, force: true });
      }
    }
  };
}
