import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron } from '@playwright/test';

/** Actual production main/worker, with a fresh profile; never opens the user's DB. */
export async function launchIsolatedElectron(executablePath: string, env: Record<string, string>) {
  const profile = await mkdtemp(path.join(tmpdir(), 'promptly-smoke-profile-'));
  const application = await electron.launch({
    executablePath,
    env,
    args: [`--user-data-dir=${profile}`],
    timeout: 20_000
  });

  try {
    await application.firstWindow();
    const actual = await application.evaluate(({ app }) => app.getPath('userData'));

    if (path.resolve(actual) !== path.resolve(profile))
      throw new Error('Packaged test profile was not isolated.');
  } catch (error) {
    await application.close();
    await rm(profile, { recursive: true, force: true });
    throw error;
  }

  return {
    application,
    dispose: async () => {
      try {
        await application.close();
      } finally {
        await rm(profile, { recursive: true, force: true });
      }
    }
  };
}
