export const styleNonceArgumentPrefix = '--promptly-style-nonce=';
export const styleNoncePlaceholder = '__PROMPTLY_STYLE_NONCE__';

export function isStyleNonce(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9+/]{24}$/u.test(value);
}

export function styleNonceFromArguments(args: readonly string[]): string {
  const value = args
    .find((arg) => arg.startsWith(styleNonceArgumentPrefix))
    ?.slice(styleNonceArgumentPrefix.length);

  if (!isStyleNonce(value)) throw new Error('Missing or invalid window style nonce');
  return value;
}
