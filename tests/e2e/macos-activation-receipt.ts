import type { launchIsolatedElectron } from '../isolated-electron';
import type * as OwnedHarness from './fixtures/macos-activation-main';
import type { CooperativeSourceSetup } from './macos-activation-source';
import type { macosFixture } from './macos-fixture';
import type { OwnedPromptlyForeground } from './macos-promptly-focus';
import { saveNativeReceipt } from './native-receipt';

type HarnessGlobal = typeof globalThis & { ownedMacActivationHarness: typeof OwnedHarness };

interface ActivationReceipt {
  sourceLaunchMode: 'launchServices' | 'direct';
  sourceSetup: CooperativeSourceSetup | undefined;
  setupCleanup: readonly ('fulfilled' | 'rejected')[] | undefined;
  terminatedSourceExit:
    { observedExit: true; exitCode: number | null; signal: NodeJS.Signals | null } | undefined;
  nativeSourceForeground: { matched: boolean; launchDateAvailable: boolean } | undefined;
  terminatedSourceRejected: boolean;
  stage: string;
  ownedWindowReady: boolean;
  fixtureReadyForeground: boolean;
  promptlyForeground: OwnedPromptlyForeground | undefined;
  nativePromptlyForeground:
    { matched: boolean; launchDateAvailable: boolean; requestMs: number } | undefined;
  activationStatus: string | undefined;
  activated: boolean;
  helperInitialized: boolean;
}

export async function finishMacosActivation(
  isolated: Awaited<ReturnType<typeof launchIsolatedElectron>>,
  ownedFixture: Awaited<ReturnType<typeof macosFixture>> | undefined,
  details: ActivationReceipt,
  priorFailure = false
) {
  const application = isolated.application;
  const snapshots = await application
    .evaluate(() => ({
      identityReadiness:
        (globalThis as Partial<HarnessGlobal>).ownedMacActivationHarness?.readinessSnapshot() ?? [],
      nativeForeground:
        (globalThis as Partial<HarnessGlobal>).ownedMacActivationHarness?.foregroundSnapshot() ?? []
    }))
    .catch(() => ({ identityReadiness: [{ status: 'mainUnavailable' }], nativeForeground: [] }));
  const fixtureForegroundAtEnd = await ownedFixture
    ?.inspect()
    .then((state) => state.foregroundMatched)
    .catch(() => undefined);

  const cleanup = await Promise.allSettled([
    application.evaluate(async () => {
      await (globalThis as Partial<HarnessGlobal>).ownedMacActivationHarness?.dispose();
    }),
    ownedFixture?.close()
  ]);
  const electronCleanup = await Promise.allSettled([isolated.dispose()]);
  const failures = [...cleanup, ...electronCleanup].flatMap((result): unknown[] => {
    if (result.status !== 'rejected') return [];
    const reason: unknown = result.reason;

    return [reason];
  });

  try {
    await saveNativeReceipt('macos-source-activation-receipt', {
      ...details,
      ...snapshots,
      priorFailure,
      cleanup: {
        harness: cleanup[0].status,
        fixture: ownedFixture ? cleanup[1].status : 'notStarted',
        electron: electronCleanup[0].status,
        failureCount: failures.length
      },
      fixtureForegroundAtEnd,
      realOwnedPromptlyWindow: true,
      helperOwnedByElectronMain: details.helperInitialized,
      actualForegroundVerified: details.activated,
      selectionAndPasteboardCounterPreserved: details.activated,
      humanTccMatrix: false
    });
  } catch (error) {
    failures.push(error);
  }

  // An existing assertion/setup error stays primary; the receipt still records cleanup failures.
  if (failures.length && !priorFailure)
    throw new AggregateError(failures, 'Owned macOS activation cleanup or receipt failed');
}
