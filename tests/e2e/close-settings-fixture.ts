import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import type { ElectronApplication } from '@playwright/test';
import { z } from 'zod';

interface OwnedSettingsCleanup {
  close: () => Promise<void>;
  profile: string;
  native: boolean;
  mayRemoveProfile?: () => boolean;
  retainReceipt?: (receipt: Buffer) => Promise<void>;
}

/** Startup and normal disposal share receipt retention before validation/profile deletion. */
export async function closeSettingsFixture(options: OwnedSettingsCleanup): Promise<void> {
  const failures: unknown[] = [];

  try {
    await options.close();
  } catch (error) {
    failures.push(error);
  }

  try {
    if (options.native) {
      const receipt = await readFile(
        path.join(options.profile, 'native-preferences-restored.json')
      );

      await options.retainReceipt?.(receipt);
      if (
        !z.object({ restorationOk: z.literal(true) }).safeParse(JSON.parse(receipt.toString()))
          .success
      )
        throw new Error('Native preference restoration failed; see retained receipt.');
    }
  } catch (error) {
    failures.push(error);
  } finally {
    if (options.mayRemoveProfile?.() === false) {
      failures.push(new Error('Owned process death unverified; profile retained.'));
    } else {
      await rm(options.profile, { recursive: true, force: true }).catch((error: unknown) => {
        failures.push(error);
      });
    }
  }

  if (failures.length > 0) throw new AggregateError(failures, 'Owned Settings cleanup failed.');
}

/** Preserve the production 40s drain while bounding owned runner cleanup. */
export async function closeOwnedApplication(
  application: ElectronApplication,
  child: ChildProcess
): Promise<void> {
  const exited = () => child.exitCode !== null || child.signalCode !== null;

  if (exited()) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Owned application did not close after production drain.'));
    }, 45_000);
  });

  try {
    await Promise.race([application.close(), deadline]);
    if (!exited()) await Promise.race([once(child, 'close'), deadline]);
  } catch (primary) {
    if (!exited()) {
      const closed = once(child, 'close');

      child.kill();
      let terminationTimer: ReturnType<typeof setTimeout> | undefined;

      try {
        const [cleanup] = await Promise.allSettled([
          Promise.race([
            closed,
            new Promise<never>((_, reject) => {
              terminationTimer = setTimeout(() => {
                reject(new Error('Owned process death remains unverified.'));
              }, 5_000);
            })
          ])
        ]);

        if (cleanup.status === 'rejected')
          throw new AggregateError(
            [primary, cleanup.reason],
            'Owned close and termination failed.',
            { cause: primary }
          );
      } finally {
        clearTimeout(terminationTimer);
      }
    }

    throw primary;
  } finally {
    clearTimeout(timer);
  }
}
