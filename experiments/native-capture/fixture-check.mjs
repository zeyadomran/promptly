import assert from 'node:assert/strict';

import { startFixture } from './fixture-process.mjs';

export async function checkNativeFixtures(executable, helper, accessibilityAllowed) {
  const evidence = [];

  for (const [mode, expected] of [
    ['selected', 'ok'],
    ['empty', 'empty'],
    ['password', 'secureInput']
  ]) {
    const fixture = await startFixture(executable, mode);

    try {
      const { fixturePid, foregroundMatched } = fixture;
      const elapsed = [];
      const roundTrips = [];

      if (process.platform === 'darwin')
        assert.equal(foregroundMatched, true, 'Fixture must own foreground before reading');

      if (!accessibilityAllowed) {
        const denied = await helper.request('capture', { expectedPid: fixturePid });

        assert.equal(denied.status, 'permissionDenied');
        evidence.push({
          fixture: mode,
          status: 'permissionDenied',
          samples: 1,
          selectionVerified: false
        });
        continue;
      }

      for (let sample = 0; sample < 10; sample++) {
        const requestStart = performance.now();
        const result = await helper.request('capture', {
          expectedPid: fixturePid,
          includeText: true
        });

        roundTrips.push(performance.now() - requestStart);

        assert.equal(result.status, expected, `Controlled ${mode} fixture`);
        assert.equal(result.source?.pid, fixturePid);

        if (expected === 'ok') assert.equal(result.text.trim(), 'Promptly fixture selection');
        else assert.equal(result.text, undefined);
        elapsed.push(result.elapsedMs);
      }

      const sortedNative = [...elapsed].sort((left, right) => left - right);
      const sortedTrips = [...roundTrips].sort((left, right) => left - right);

      evidence.push({
        fixture: mode,
        status: expected,
        samples: 10,
        selectionVerified: true,
        coldNativeMs: elapsed[0],
        warmMaxNativeMs: Math.max(...elapsed.slice(1)),
        p50NativeMs: sortedNative[4],
        p95NativeMs: sortedNative[9],
        p50RoundTripMs: sortedTrips[4],
        p95RoundTripMs: sortedTrips[9],
        maxRoundTripMs: Math.max(...roundTrips),
        maxNativeMs: Math.max(...elapsed)
      });
    } finally {
      await fixture.close();
    }
  }

  return evidence;
}
