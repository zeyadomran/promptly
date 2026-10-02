import { setNonce } from 'get-nonce';

import { isStyleNonce } from '../../shared/style-nonce';

/** The supported nonce API used by Radix's scrollbar style singleton. */
export function initializeStyleNonce() {
  const nonce: unknown = window.promptlyStyleNonce;

  if (nonce === undefined && import.meta.env.DEV) return;
  if (!isStyleNonce(nonce)) throw new Error('Missing style nonce');
  setNonce(nonce);
}
