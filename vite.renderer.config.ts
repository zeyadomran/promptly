import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    {
      name: 'renderer-content-security-policy',
      transformIndexHtml(html) {
        const connect = command === 'serve' ? "'self' ws://127.0.0.1:5173" : "'none'";
        const style = command === 'serve' ? "'self' 'unsafe-inline'" : "'self'";

        return html.replace(
          '__CSP__',
          `default-src 'none'; script-src 'self'; style-src ${style}; img-src 'self'; font-src 'self'; connect-src ${connect}; base-uri 'none'; form-action 'none'; object-src 'none'`
        );
      }
    }
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true }
}));
