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
  const fixture = await macosFixture('selected').catch(async (error: unknown) => {
    await isolated.dispose();
    throw error;
  });
  let activated = false;

  try {
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
        await harness.recordFixture();
      },
      { harnessPath, fixturePid: fixture.fixturePid }
    );
    const before = await fixture.inspect();
    const selected = await application.evaluate(() =>
      (globalThis as HarnessGlobal).ownedMacActivationHarness.capture()
    );

    expect(before.foregroundMatched).toBe(true);
    expect(selected?.status).toBe('ok');
    if (selected?.status !== 'ok') throw new Error('Missing owned selection');
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
    const activation = await application.evaluate(() =>
      (globalThis as HarnessGlobal).ownedMacActivationHarness.activate()
    );

    expect(activation).toBe('ok');
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
  } finally {
    await saveNativeReceipt('macos-source-activation-receipt', {
      activated,
      realOwnedPromptlyWindow: true,
      helperOwnedByElectronMain: true,
      actualForegroundVerified: activated,
      selectionAndPasteboardCounterPreserved: activated,
      humanTccMatrix: false
    });
    await Promise.allSettled([
      application.evaluate(async () => {
        await (globalThis as Partial<HarnessGlobal>).ownedMacActivationHarness?.dispose();
      }),
      fixture.close()
    ]);
    await isolated.dispose();
  }
});
