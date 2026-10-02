import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  timeout: 45_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1000, height: 1400 } },
  webServer: {
    command: 'npx vite --config vite.renderer.config.ts',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false
  }
});
