// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';

import { finishMacosActivation } from '../e2e/macos-activation-receipt';
import { OwnedFixtureSetupError } from '../e2e/macos-fixture-failure';
import { saveNativeReceipt } from '../e2e/native-receipt';

vi.mock('../e2e/native-receipt', () => ({ saveNativeReceipt: vi.fn(async () => {}) }));
beforeEach(() => {
  vi.clearAllMocks();
});

function owned() {
  const isolated = {
    application: {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({ identityReadiness: [], nativeForeground: [] })
        .mockResolvedValue(undefined)
    },
    dispose: vi.fn().mockResolvedValue(undefined)
  };
  const fixture = {
    inspect: vi.fn().mockResolvedValue({ foregroundMatched: true }),
    close: vi.fn().mockResolvedValue({ observedExit: true, exitCode: 0, signal: null })
  };
  const details = {
    sourceLaunchMode: 'direct',
    activated: true,
    helperInitialized: true,
    stage: 'complete'
  };

  return { isolated, fixture, details };
}

test('normal completion cannot pass when fixture termination is unobserved', async () => {
  const { isolated, fixture, details } = owned();

  fixture.close.mockRejectedValue(new Error('private owned fake failure'));
  await expect(finishMacosActivation(isolated, fixture, details)).rejects.toThrow(
    'activation cleanup or receipt failed'
  );
  expect(isolated.dispose).toHaveBeenCalledTimes(1);
  const receipt = saveNativeReceipt.mock.calls[0][1];

  expect(receipt.cleanup).toEqual({
    harness: 'fulfilled',
    fixture: 'rejected',
    electron: 'fulfilled',
    failureCount: 1
  });
  expect(JSON.stringify(receipt)).not.toContain('private');
});

test('an existing failure stays primary while every cleanup result is retained', async () => {
  const { isolated, fixture, details } = owned();

  fixture.close.mockRejectedValue(new Error('owned fake termination failed'));
  isolated.dispose.mockRejectedValue(new Error('owned fake application disposal failed'));
  await expect(finishMacosActivation(isolated, fixture, details, true)).resolves.toBeUndefined();
  expect(saveNativeReceipt.mock.calls[0][1]).toMatchObject({
    priorFailure: true,
    cleanup: { fixture: 'rejected', electron: 'rejected', failureCount: 2 }
  });
});

test('successful completion retains observed fixture and application cleanup', async () => {
  const { isolated, fixture, details } = owned();

  await finishMacosActivation(isolated, fixture, details);
  expect(saveNativeReceipt.mock.calls[0][1].cleanup).toEqual({
    harness: 'fulfilled',
    fixture: 'fulfilled',
    electron: 'fulfilled',
    failureCount: 0
  });
});

test('setup aggregation preserves original cause and nested safe outcomes', () => {
  const primary = new Error('owned primary failure');
  const first = new OwnedFixtureSetupError(primary, [
    { status: 'rejected', reason: new Error('private cleanup failure') }
  ]);
  const second = new OwnedFixtureSetupError(first, [{ status: 'fulfilled', value: undefined }]);

  expect(first.cause).toBe(primary);
  expect(first.errors[0]).toBe(primary);
  expect(second.cause).toBe(first);
  expect(second.cleanupOutcomes).toEqual(['rejected', 'fulfilled']);
  expect(JSON.stringify(second.cleanupOutcomes)).not.toContain('private');
});
