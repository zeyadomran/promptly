import { describe, expect, it } from 'vitest';

import { isStyleNonce, styleNonceFromArguments } from './style-nonce';

describe('style nonce bootstrap', () => {
  it('requires a validated 144-bit main-generated nonce argument', () => {
    const nonce = '12345678901234567890abcd';

    expect(isStyleNonce(nonce)).toBe(true);
    expect(styleNonceFromArguments(['app', `--promptly-style-nonce=${nonce}`])).toBe(nonce);
    for (const value of ['', 'unsafe-inline', "injected'", undefined, 42]) {
      expect(isStyleNonce(value)).toBe(false);
    }

    expect(() => styleNonceFromArguments([])).toThrow('Missing or invalid');
    expect(() => styleNonceFromArguments(['--promptly-style-nonce=invalid'])).toThrow(
      'Missing or invalid'
    );
  });
});
