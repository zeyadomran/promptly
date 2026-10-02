// @vitest-environment node
import { expect, it } from 'vitest';

import { runOwnedHookFixture } from './storage-worker-hook-fixture.mjs';

it('actual Vitest abandons a pending owned close with its shorter default hook budget', async () => {
  expect(await runOwnedHookFixture(false)).toEqual({
    exitCode: 1,
    bodyTimeoutRetained: true,
    hookTimeoutReported: true,
    teardownStarted: true,
    terminationObserved: false,
    directoryRemoved: false
  });
}, 15_000);

it('actual Vitest preserves the body timeout while explicit teardown waits for pending close/removal', async () => {
  expect(await runOwnedHookFixture(true)).toEqual({
    exitCode: 1,
    bodyTimeoutRetained: true,
    hookTimeoutReported: false,
    teardownStarted: true,
    terminationObserved: true,
    directoryRemoved: true
  });
}, 15_000);
