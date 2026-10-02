import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

export async function checkNativeFixtures(executable, helper, accessibilityAllowed) {
  const evidence = [];

  for (const [mode, expected] of [
    ['selected', 'ok'],
    ['empty', 'empty'],
    ['password', 'secureInput']
  ]) {
    const fixture = spawn(executable, ['--fixture', mode], {
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true
    });
    const lines = createInterface({ input: fixture.stdout });
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 5000);

    try {
      const [line] = await once(lines, 'line', { signal: abort.signal });
      const { fixturePid } = JSON.parse(line);
      const elapsed = [];
      const roundTrips = [];

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
      clearTimeout(timer);
      lines.close();
      fixture.kill();
    }
  }

  return evidence;
}
