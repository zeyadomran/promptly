// @vitest-environment node
import { expect, test, vi } from 'vitest';

import { buildSessionSidecar } from '../e2e/build-session-sidecar';
import { launchSessionSidecar } from '../e2e/session-sidecar';
import { decodeSessionState, sessionObservationAvailable } from '../e2e/session-state';

const receipt = {
  phase: 'inspect',
  pid: 42,
  listening: true,
  tapInstalled: true,
  enabled: true,
  secureInput: false,
  down: 1,
  up: 1,
  disabled: 0,
  elapsedMs: 250
};

test('fresh scalar tap health is required independently of matching counts', () => {
  expect(decodeSessionState(JSON.stringify(receipt))).toEqual(receipt);
  expect(sessionObservationAvailable(receipt)).toBe(true);
  expect(sessionObservationAvailable({ ...receipt, down: 0, up: 0 })).toBe(true);
});

test.each([
  { listening: false },
  { tapInstalled: false },
  { enabled: false },
  { secureInput: true },
  { disabled: 1 }
])('unavailable health is inconclusive and cannot authorize probe input: %j', (patch) => {
  expect(sessionObservationAvailable({ ...receipt, ...patch })).toBe(false);
});

test.each([
  { down: 1025 },
  { up: -1 },
  { disabled: 0.5 },
  { pid: 0 },
  { elapsedMs: -1 },
  { phase: 'unexpected' },
  { text: 'private typed text' },
  { foreignPid: 99 }
])('schema refuses overflow, unexpected identity and contents: %j', (patch) => {
  expect(() => decodeSessionState(JSON.stringify({ ...receipt, ...patch }))).toThrow(
    'Invalid owned session sidecar receipt'
  );
});

test('malformed receipt text is not reflected in diagnostics', () => {
  expect(() => decodeSessionState('private typed text')).toThrow(
    'Invalid owned session sidecar receipt'
  );
});

test('local and non-hosted launches/builds reject before filesystem or process work', async () => {
  vi.stubEnv('RUNNER_ENVIRONMENT', 'self-hosted');
  try {
    await expect(buildSessionSidecar('nonexistent-owned-path')).rejects.toThrow(
      'GitHub-hosted macOS'
    );
    await expect(
      launchSessionSidecar({ main: 'nonexistent', executable: 'nonexistent' })
    ).rejects.toThrow('GitHub-hosted macOS');
  } finally {
    vi.unstubAllEnvs();
  }
});
