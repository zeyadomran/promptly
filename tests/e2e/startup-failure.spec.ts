import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { expect, test } from '@playwright/test';

import { observeStartupProcess } from '../observed-startup-process';
import { writeSettingsReceipt } from './settings-receipt';

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
  const profile = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-fatal-startup-')));
  const filename = path.join(profile, 'promptly.sqlite');
  let stage = 'profile-setup';
  let receipt: Awaited<ReturnType<typeof observeStartupProcess>> | undefined;
  let unchangedDatabase = false;
  let primary: unknown;
  let primaryFailed = false;
  const failures: unknown[] = [];

  try {
    const database = new DatabaseSync(filename);

    try {
      database.exec('PRAGMA user_version = 2147483647');
    } finally {
      database.close();
    }

    stage = 'observed-packaged-process';
    receipt = await observeStartupProcess(executable, [`--user-data-dir=${profile}`], env);
    stage = 'database-integrity';
    const after = new DatabaseSync(filename, { readOnly: true });

    try {
      unchangedDatabase =
        after.prepare('PRAGMA user_version').get()?.['user_version'] === 2147483647;
    } finally {
      after.close();
    }

    expect(receipt).toMatchObject({
      status: 'exited',
      exitCode: 1,
      signal: null,
      signals: expect.arrayContaining(['initializationFailed', 'storageOpenFailed']),
      cleanup: { closed: true, pidGone: true, forcedTermination: false }
    });
    expect(unchangedDatabase).toBe(true);
    stage = 'qualified';
  } catch (error) {
    primary = error;
    primaryFailed = true;
  } finally {
    try {
      await writeSettingsReceipt(
        test.info(),
        'fatal-startup',
        JSON.stringify({
          stage,
          profileIsolated: true,
          unchangedDatabase,
          profileRetained: receipt?.cleanup.pidGone === false,
          ...receipt
        })
      );
    } catch (error) {
      failures.push(error);
    }

    if (receipt?.cleanup.pidGone !== false) {
      try {
        await rm(profile, { recursive: true, force: true });
      } catch (error) {
        failures.push(error);
      }
    }
  }

  if (failures.length > 0)
    throw new AggregateError(
      primaryFailed ? [primary, ...failures] : failures,
      'Owned fatal startup evidence or cleanup failed.',
      { cause: primaryFailed ? primary : failures[0] }
    );
  if (primaryFailed) throw primary;
});
