import { randomBytes } from 'node:crypto';
import path from 'node:path';

import { nativeTheme, net, type Session } from 'electron';

import { settingsSchema } from '../../shared/contracts/settings';
import { styleNoncePlaceholder } from '../../shared/style-nonce';
import { rendererAssetPath } from './renderer-asset-path';

const sessionNonces = new WeakMap<Session, string>();

/** A fresh nonce per app session; no nonce is embedded in the distributable. */
export function installRendererAssets(
  session: Session,
  indexPath: string,
  useBundledAssets: boolean
): string {
  const existing = sessionNonces.get(session);

  if (existing !== undefined) return existing;
  const nonce = randomBytes(18).toString('base64');
  const directory = path.dirname(indexPath);

  if (!useBundledAssets) {
    sessionNonces.set(session, nonce);
    return nonce;
  }

  session.protocol.handle('file', async (request) => {
    const asset = rendererAssetPath(request.url, directory);

    if (asset === undefined || (request.method !== 'GET' && request.method !== 'HEAD')) {
      return new Response(null, { status: 403 });
    }

    const response = await net.fetch(request, { bypassCustomProtocolHandlers: true });

    if (asset !== indexPath || request.method === 'HEAD' || !response.ok) return response;
    const html = await response.text();

    if (!html.includes(styleNoncePlaceholder)) {
      return new Response('Missing renderer style nonce policy', { status: 500 });
    }

    const headers = new Headers(response.headers);

    headers.delete('content-length');
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'no-store');
    const theme = settingsSchema.shape.theme.parse(nativeTheme.themeSource);

    return new Response(
      html
        .replaceAll(styleNoncePlaceholder, nonce)
        .replace('<html ', `<html data-theme="${theme}" `),
      { headers }
    );
  });
  sessionNonces.set(session, nonce);
  return nonce;
}
