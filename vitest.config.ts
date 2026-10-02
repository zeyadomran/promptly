import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src/renderer', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.mjs']
  }
});
