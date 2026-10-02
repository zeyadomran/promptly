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
  { ...receipt, carbonPressed: 1025 },
  { ...receipt, sessionUp: -1 },
  { ...receipt, pid: 0 },
  { ...receipt, elapsedMs: -1 },
  { ...receipt, text: 'private typed contents' },
  { ...receipt, phase: 'unexpected' }
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
