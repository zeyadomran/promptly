import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';
import { buildMacosActivation } from './build-macos-activation';
import type * as OwnedHarness from './fixtures/macos-activation-main';
import { buildMacosFixture, macosFixture } from './macos-fixture';
import { saveNativeReceipt } from './native-receipt';

type HarnessGlobal = typeof globalThis & { ownedMacActivationHarness: typeof OwnedHarness };

test('packaged macOS source activation hands foreground back from owned Promptly', async () => {
  test.skip(process.platform !== 'darwin', 'OS activation qualification requires macOS');
  test.setTimeout(60_000);
  await buildMacosFixture();
  const harnessPath = await buildMacosActivation();
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  }

  const executable = path.resolve(
    'out',
    `Promptly-darwin-${process.arch}`,
    'Promptly.app',
    'Contents',
    'MacOS',
    'Promptly'
  );
  const isolated = await launchIsolatedElectron(executable, env);
  const application = isolated.application;
  let ownedWindowReady = false;
  let fixtureReadyForeground = false;
  let stage = 'window-ready';
  let activationStatus: string | undefined;
  let helperInitialized = false;
  let ownedFixture: Awaited<ReturnType<typeof macosFixture>> | undefined;
  let activated = false;

  try {
    const page = await application.firstWindow();

    // Window existence precedes ready-to-show; settle its actual renderer/native show
    // before LaunchServices activates the owned fixture.
    await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    await expect
      .poll(
        () =>
          application.evaluate(({ BrowserWindow }) => {
            const window = BrowserWindow.getAllWindows()[0];

            return window !== undefined && window.isVisible() && !window.webContents.isLoading();
          }),
        { timeout: 5000 }
      )
      .toBe(true);
    ownedWindowReady = true;
    const fixture = await macosFixture('selected');

    ownedFixture = fixture;
    stage = 'fixture-identity';
    fixtureReadyForeground = fixture.foregroundMatched;
    // Direct owned main-process evaluation only. This module is never shipped or exposed by IPC.
    await application.evaluate(
      async ({ app }, { harnessPath: ownedHarnessPath, fixturePid }) => {
        const load = process
          .getBuiltinModule('module')
          .createRequire(`${app.getAppPath()}/.vite/build/main.cjs`);
        const module_: unknown = load(ownedHarnessPath);
        const harness = module_ as typeof OwnedHarness;

        Object.assign(globalThis, { ownedMacActivationHarness: harness });
        await harness.initialize(fixturePid);
      },
      { harnessPath, fixturePid: fixture.fixturePid }
    );
    helperInitialized = true;
    // Startup readiness is identity-only and bounded. Every production identity
    // request still has its own unchanged 100 ms deadline; no selection is retried.
    await expect
      .poll(
        async () => {
          const observation = await application.evaluate(() =>
            (globalThis as HarnessGlobal).ownedMacActivationHarness.recordFixture()
          );

          return observation.owned;
        },
        { timeout: 5000, intervals: [50, 100, 200] }
      )
      .toBe(true);
    stage = 'capture-before-handoff';
    const before = await fixture.inspect();
    const selected = await application.evaluate(() =>
      (globalThis as HarnessGlobal).ownedMacActivationHarness.capture()
    );

    expect(before.foregroundMatched).toBe(true);
    expect(selected?.status).toBe('ok');
    if (selected?.status !== 'ok') throw new Error('Missing owned selection');
    stage = 'promptly-foreground';
    await application.evaluate(({ app, BrowserWindow }) => {
      app.focus();
      BrowserWindow.getAllWindows()[0]?.focus();
    });
    await expect.poll(async () => (await fixture.inspect()).foregroundMatched).toBe(false);
    expect(
      await application.evaluate(() =>
        (globalThis as HarnessGlobal).ownedMacActivationHarness.foreground()
      )
    ).toEqual({ fixture: false, promptly: true });
    expect(await fixture.inspect()).toEqual({ ...before, foregroundMatched: false });
    expect(
      await application.evaluate(() =>
        (globalThis as HarnessGlobal).ownedMacActivationHarness.activateForged()
      )
    ).toBe('foregroundChanged');
    expect((await fixture.inspect()).foregroundMatched).toBe(false);
    stage = 'source-activation';
    const activation = await application.evaluate(() =>
      (globalThis as HarnessGlobal).ownedMacActivationHarness.activate()
    );

    activationStatus = activation;

    expect(activation).toBe('ok');
    stage = 'handoff-verification';
    // Status alone is insufficient: verify the actual frontmost OS app and full fixture state.
    await expect.poll(async () => (await fixture.inspect()).foregroundMatched).toBe(true);
    expect(await fixture.inspect()).toEqual(before);
    expect(
      await application.evaluate(() =>
        (globalThis as HarnessGlobal).ownedMacActivationHarness.foreground()
      )
    ).toEqual({ fixture: true, promptly: false });
    const captured = await application.evaluate(() =>
      (globalThis as HarnessGlobal).ownedMacActivationHarness.capture()
    );

    expect(captured?.status).toBe('ok');
    if (captured?.status === 'ok') expect(captured.text).toBe(selected.text);
    expect(await fixture.inspect()).toEqual(before);
    activated = true;
    stage = 'complete';
  } finally {
    const identityReadiness = await application
      .evaluate(
        () =>
          (globalThis as Partial<HarnessGlobal>).ownedMacActivationHarness?.readinessSnapshot() ??
          []
      )
      .catch(() => [{ status: 'mainUnavailable' }]);
    const fixtureForegroundAtEnd = await ownedFixture
      ?.inspect()
      .then((state) => state.foregroundMatched)
      .catch(() => undefined);

    try {
      await saveNativeReceipt('macos-source-activation-receipt', {
        stage,
        ownedWindowReady,
        fixtureReadyForeground,
        fixtureForegroundAtEnd,
        identityReadiness,
        activationStatus,
        activated,
        realOwnedPromptlyWindow: true,
        helperOwnedByElectronMain: helperInitialized,
        actualForegroundVerified: activated,
        selectionAndPasteboardCounterPreserved: activated,
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
});
