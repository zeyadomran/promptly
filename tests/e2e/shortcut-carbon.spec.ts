import { expect, test } from '@playwright/test';
import { z } from 'zod';

import { buildCarbonControl } from './build-carbon-control';
import { buildSessionSidecar } from './build-session-sidecar';
import { launchCarbonControl } from './carbon-control';
import { isHostedMacosProbe } from './carbon-hosted';
import { writeWindowReceipt } from './native-window-receipt';
import { probeChords } from './probe-chord';
import { launchSessionSidecar } from './session-sidecar';
import { sessionObservationAvailable, type SessionState } from './session-state';

for (const chord of probeChords) {
  test(`owned AppKit Carbon control partitions ${chord} delivery`, async ({
    browserName
  }, testInfo) => {
    test.skip(!isHostedMacosProbe(process.platform, process.env), 'Hosted owned macOS probe only');
    test.setTimeout(45_000);
    let control: Awaited<ReturnType<typeof launchCarbonControl>> | undefined;
    let sidecar: Awaited<ReturnType<typeof launchSessionSidecar>> | undefined;
    let sessionReady: SessionState | undefined;
    let sessionBeforeInput: SessionState | undefined;
    let sessionFinal: SessionState | undefined;
    let sessionCleanup: unknown;
    const sessionCleanupOutcomes: { stage: string; status: string }[] = [];
    let observationAvailable = false;
    let probeInputAttempted = false;
    let ready: unknown;
    let delivery: unknown;
    let final: unknown;
    let cleanup: unknown;
    let failed = false;
    let failure: unknown;
    const cleanupFailures: unknown[] = [];

    try {
      const builtSidecar = await buildSessionSidecar(testInfo.outputPath('session-build'));
      const builtControl = await buildCarbonControl(testInfo.outputPath('carbon-build'));

      sidecar = await launchSessionSidecar(
        builtSidecar,
        (stage, status) => {
          sessionCleanupOutcomes.push({ stage, status });
        },
        chord
      );
      sessionReady = await sidecar.ready();
      control = await launchCarbonControl(builtControl, chord);
      const observed = await control.ready();

      ready = observed;
      expect(observed).toMatchObject({
        chord,
        foregroundMatched: true,
        handlerStatus: 0,
        registrationStatus: 0,
        localMonitorInstalled: true
      });
      sessionBeforeInput = await sidecar.inspect();
      expect(sessionReady.chord).toBe(chord);
      expect(sessionBeforeInput.chord).toBe(chord);
      observationAvailable =
        sessionObservationAvailable(sessionReady) &&
        sessionObservationAvailable(sessionBeforeInput);
      if (observationAvailable) {
        probeInputAttempted = true;
        delivery = z
          .strictObject({
            status: z.enum(['sent', 'activationDenied', 'inputDenied']),
            ownedForeground: z.boolean(),
            keysInjected: z.boolean()
          })
          .parse(JSON.parse(await control.send(observed.pid)));
        expect(delivery).toEqual({ status: 'sent', ownedForeground: true, keysInjected: true });
      }
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      if (sidecar) {
        try {
          sessionFinal = await sidecar.final();
        } catch (error) {
          cleanupFailures.push(error);
        }

        try {
          sessionCleanup = await sidecar.close();
        } catch (error) {
          cleanupFailures.push(error);
        }
      }

      if (control) {
        // Retain counters even after partial delivery or a failed foreground/assertion guard.
        try {
          final = await control.final();
          expect(final).toMatchObject({ localMonitorRemoved: true });
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
          chord,
          browserName,
          sessionContext: sidecar?.context,
          sessionReady,
          sessionBeforeInput,
          sessionFinal,
          sessionCleanup,
          sessionCleanupOutcomes,
          observationAvailable,
          probeInputAttempted,
          interpretation:
            observationAvailable &&
            sessionFinal !== undefined &&
            sessionObservationAvailable(sessionFinal)
              ? 'available fixed-chord observation; not product qualification'
              : 'unavailable observation is inconclusive',
          ready,
          delivery,
          final,
          cleanup,
          failed,
          finalAvailable: final !== undefined,
          cleanupVerified: cleanup !== undefined,
          cleanupFailureCount: cleanupFailures.length,
          qualification: false,
          scope: `one allowlisted ${chord} chord; passive session tap and unchanged-return local monitor; bounded scalar counts/booleans`
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
}
