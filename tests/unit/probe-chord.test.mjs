// @vitest-environment node
import { expect, test } from 'vitest';

import { parseProbeChord, probeChords, probeDriverAction } from '../e2e/probe-chord';

test('exactly two named controls preserve F11 pin action and allow only physical K comparison', () => {
  expect(probeChords).toEqual(['ctrl-option-f11', 'ctrl-option-k']);
  expect(parseProbeChord('ctrl-option-f11')).toBe('ctrl-option-f11');
  expect(parseProbeChord('ctrl-option-k')).toBe('ctrl-option-k');
  expect(probeDriverAction('ctrl-option-f11')).toBe('pin');
  expect(probeDriverAction('ctrl-option-k')).toBe('carbon-letter-k');
});

test.each([103, 40, '', 'pin', 'k', 'Control+Alt+K', 'private arbitrary input', undefined])(
  'arbitrary keys/characters/actions are rejected without reflecting input: %j',
  (value) => {
    expect(() => parseProbeChord(value)).toThrow('Invalid owned probe chord');
    expect(() => probeDriverAction(value)).toThrow('Invalid owned probe chord');
  }
);
