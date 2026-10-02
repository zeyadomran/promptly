import type { launchIsolatedElectron } from '../isolated-electron';
import type * as OwnedHarness from './fixtures/macos-activation-main';
import type { macosFixture } from './macos-fixture';
import type { OwnedPromptlyForeground } from './macos-promptly-focus';
import { saveNativeReceipt } from './native-receipt';

type HarnessGlobal = typeof globalThis & { ownedMacActivationHarness: typeof OwnedHarness };

interface ActivationReceipt {
  sourceLaunchMode: 'launchServices' | 'direct';
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
  details: ActivationReceipt
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

  try {
    await saveNativeReceipt('macos-source-activation-receipt', {
      ...details,
      ...snapshots,
      fixtureForegroundAtEnd,
      realOwnedPromptlyWindow: true,
      helperOwnedByElectronMain: details.helperInitialized,
      actualForegroundVerified: details.activated,
      selectionAndPasteboardCounterPreserved: details.activated,
      humanTccMatrix: false
    });
  } finally {
    await Promise.allSettled([
      application.evaluate(async () => {
        await (globalThis as Partial<HarnessGlobal>).ownedMacActivationHarness?.dispose();
      }),
      ownedFixture?.close()
    ]);
    await isolated.dispose();
  }
}
