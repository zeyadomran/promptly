// @vitest-environment node
import { expect, it } from 'vitest';

import { recordMacosCapture } from '../e2e/macos-capture-receipt';

it('retains a failed recovery capture status/timing while excluding private native payload', () => {
  const evidence = [];

  recordMacosCapture(
    evidence,
    'recovery-fresh-capture',
    performance.now(),
    {
      status: 'timedOut',
      text: 'private fixture',
      identity: 'secret identity',
      source: { name: 'private app' }
    },
    { ownedPidMatched: true }
  );
  expect(evidence).toEqual([
    {
      phase: 'recovery-fresh-capture',
      status: 'timedOut',
      roundTripMs: expect.any(Number),
      deadlineMs: 100,
      ownedPidMatched: true
    }
  ]);
  expect(JSON.stringify(evidence)).not.toMatch(/private|secret|source/);
});
