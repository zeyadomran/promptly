import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { emptyStyleHash, sonnerStyleHash } from './scripts/sonner-style-hash';
import { styleNoncePlaceholder } from './src/shared/style-nonce';

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('./src/renderer/capture-toast', import.meta.url)),
  build: { outDir: fileURLToPath(new URL('./.vite/renderer/capture_toast', import.meta.url)) },
  html: { cspNonce: styleNoncePlaceholder },
  plugins: [
    tailwindcss(),
    {
      name: 'confirmation-content-security-policy',
      transformIndexHtml(html) {
        const connect = command === 'serve' ? "'self' ws://127.0.0.1:5174" : "'none'";

        return html.replace(
          '__CSP__',
          `default-src 'none'; script-src 'self'; style-src 'self' ${sonnerStyleHash()} ${emptyStyleHash()} 'nonce-${styleNoncePlaceholder}'; img-src 'self'; font-src 'self'; connect-src ${connect}; base-uri 'none'; form-action 'none'; object-src 'none'`
        );
      }
    }
  ],
  server: { host: '127.0.0.1', port: 5174, strictPort: true }
}));
