import { expect, test } from '@playwright/test';
import { z } from 'zod';

import { launchCarbonControl } from './carbon-control';
import { isHostedMacosProbe } from './carbon-hosted';
import { writeWindowReceipt } from './native-window-receipt';

test('owned AppKit Carbon control partitions fixed shortcut delivery', async ({
  browserName
}, testInfo) => {
  test.skip(!isHostedMacosProbe(process.platform, process.env), 'Hosted owned macOS probe only');
  test.setTimeout(45_000);
  let control: Awaited<ReturnType<typeof launchCarbonControl>> | undefined;
  let ready: unknown;
  let delivery: unknown;
  let final: unknown;
  let cleanup: unknown;
  let failed = false;
  let failure: unknown;
  const cleanupFailures: unknown[] = [];

  try {
    control = await launchCarbonControl(testInfo.outputPath('carbon-build'));
    const observed = await control.ready();

    ready = observed;
    expect(observed).toMatchObject({
      foregroundMatched: true,
      handlerStatus: 0,
      registrationStatus: 0
    });
    delivery = z
      .strictObject({
        status: z.enum(['sent', 'activationDenied', 'inputDenied']),
        ownedForeground: z.boolean(),
        keysInjected: z.boolean()
      })
      .parse(JSON.parse(await control.send(observed.pid)));
    expect(delivery).toEqual({ status: 'sent', ownedForeground: true, keysInjected: true });
  } catch (error) {
    failed = true;
    failure = error;
  } finally {
    if (control) {
      // Retain counters even after partial delivery or a failed foreground/assertion guard.
      try {
        final = await control.final();
      } catch (error) {
        cleanupFailures.push(error);
      }

      try {
        cleanup = await control.close();
      } catch (error) {
        cleanupFailures.push(error);
      }
    }

    try {
      await writeWindowReceipt('shortcut-carbon-control', {
        browserName,
        ready,
        delivery,
        final,
        cleanup,
        failed,
        finalAvailable: final !== undefined,
        cleanupVerified: cleanup !== undefined,
        cleanupFailureCount: cleanupFailures.length,
        qualification: false,
        scope: 'one fixed Control+Option F11 chord; passive session tap; bounded scalar counts'
      });
    } catch (error) {
      cleanupFailures.push(error);
    }
  }

  // Receipt/cleanup failures cannot replace the original assertion or driver failure.
  if (failed) throw failure;
  if (cleanupFailures.length)
    throw new AggregateError(cleanupFailures, 'Carbon diagnostic receipt or cleanup failed');
});
