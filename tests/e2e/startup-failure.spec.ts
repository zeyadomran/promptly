import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron, OwnedStartupError } from '../isolated-electron';

test('owned unsupported database fails startup with retained exit diagnostics before any window', async () => {
  const directory = path.resolve('out', `Promptly-${process.platform}-${process.arch}`);
  const executable =
    process.platform === 'darwin'
      ? path.join(directory, 'Promptly.app', 'Contents', 'MacOS', 'Promptly')
      : path.join(directory, 'Promptly.exe');
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE'
    )
  );
  let receipt: object | undefined;

  try {
    const isolated = await launchIsolatedElectron(executable, env, (profile) => {
      const database = new DatabaseSync(path.join(profile, 'promptly.sqlite'));

      try {
        database.exec('PRAGMA user_version = 2147483647');
      } finally {
        database.close();
      }
    });

    await isolated.dispose();
    throw new Error('Unsupported owned profile unexpectedly opened a window');
  } catch (error) {
    if (!(error instanceof OwnedStartupError)) throw error;
    receipt = error.receipt;
  }

  expect(receipt).toMatchObject({
    status: 'failed',
    stage: 'first-window',
    exitCode: 1,
    signals: expect.arrayContaining(['initializationFailed'])
  });
});
