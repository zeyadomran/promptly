import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { emptyStyleHash, sonnerStyleHash } from './scripts/sonner-style-hash';
import { styleNoncePlaceholder } from './src/shared/style-nonce';

export default defineConfig(({ command }) => ({
  define: {
    'import.meta.env.PROMPTLY_DESIGN_FIXTURE': JSON.stringify(
      process.env['PROMPTLY_DESIGN_FIXTURE'] ?? ''
    )
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src/renderer', import.meta.url)) } },
  plugins: [
    tailwindcss(),
    {
      name: 'renderer-content-security-policy',
      transformIndexHtml(html) {
        const connect = command === 'serve' ? "'self' ws://127.0.0.1:5173" : "'none'";
        const style =
          command === 'serve'
            ? "'self' 'unsafe-inline'"
            : `'self' ${sonnerStyleHash()} ${emptyStyleHash()} 'nonce-${styleNoncePlaceholder}'`;

        return html.replace(
          '__CSP__',
          `default-src 'none'; script-src 'self'; style-src ${style}; img-src 'self'; font-src 'self'; connect-src ${connect}; base-uri 'none'; form-action 'none'; object-src 'none'`
        );
      }
    }
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true }
}));
