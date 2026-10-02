import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

interface OwnedSettingsCleanup {
  close: () => Promise<void>;
  profile: string;
  native: boolean;
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
    await rm(options.profile, { recursive: true, force: true }).catch((error: unknown) => {
      failures.push(error);
    });
  }

  if (failures.length > 0) throw new AggregateError(failures, 'Owned Settings cleanup failed.');
}
