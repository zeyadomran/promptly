// @vitest-environment node
import { expect, test } from 'vitest';

import { decodeCarbonState } from '../e2e/carbon-state';

const receipt = {
  phase: 'final',
  pid: 42,
  foregroundMatched: true,
  handlerStatus: 0,
  registrationStatus: 0,
  listening: true,
  tapInstalled: true,
  carbonPressed: 1,
  handlerEntered: 1,
  parameterFailed: 0,
  idMismatch: 0,
  localDown: 1,
  localUp: 1,
  localF11Character: true,
  localFunction: true,
  localNumericPad: false,
  localMonitorInstalled: true,
  localMonitorRemoved: true,
  sessionDown: 1,
  sessionUp: 1,
  tapDisabled: 0,
  elapsedMs: 5000
};

test('fixed scalar Carbon counts decode independently of qualification', () => {
  expect(decodeCarbonState(JSON.stringify(receipt))).toEqual(receipt);
  expect(decodeCarbonState(JSON.stringify({ ...receipt, carbonPressed: 0 })).carbonPressed).toBe(0);
});

test.each([
  { handlerEntered: 0, parameterFailed: 0, idMismatch: 0 },
  { handlerEntered: 1, parameterFailed: 1, idMismatch: 0 },
  { handlerEntered: 1, parameterFailed: 0, idMismatch: 1 }
])('zero success count preserves each independent callback discriminator', (observations) => {
  const failed = { ...receipt, carbonPressed: 0, ...observations };

  expect(decodeCarbonState(JSON.stringify(failed))).toEqual(failed);
});

test.each([
  { ...receipt, carbonPressed: 1025 },
  { ...receipt, sessionUp: -1 },
  { ...receipt, pid: 0 },
  { ...receipt, elapsedMs: -1 },
  { ...receipt, text: 'private typed contents' },
  { ...receipt, phase: 'unexpected' },
  { ...receipt, handlerEntered: undefined },
  { ...receipt, parameterFailed: 1025 },
  { ...receipt, idMismatch: -1 },
  { ...receipt, localDown: 1025 },
  { ...receipt, localFunction: 1 },
  { ...receipt, localMonitorRemoved: undefined },
  { ...receipt, characters: 'private typed contents' },
  { ...receipt, modifierFlags: 256 }
])('invalid or non-scalar receipt is rejected without reflecting contents', (value) => {
  expect(() => decodeCarbonState(JSON.stringify(value))).toThrow('Invalid owned Carbon receipt');
  try {
    decodeCarbonState(JSON.stringify(value));
  } catch (error) {
    expect(String(error)).not.toContain('private');
  }
});

test('invalid JSON is rejected without copying text into the error', () => {
  expect(() => decodeCarbonState('private text')).toThrow('Invalid owned Carbon receipt');
});
