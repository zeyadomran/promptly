import { setNonce } from 'get-nonce';

/** The supported nonce API used by Radix's scrollbar style singleton. */
export function initializeStyleNonce() {
  const nonce: unknown = import.meta.env.PROMPTLY_STYLE_NONCE;

  if (typeof nonce !== 'string' || nonce.length === 0) throw new Error('Missing style nonce');
  setNonce(nonce);
}
