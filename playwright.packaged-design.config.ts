import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/packaged-design',
  timeout: 45_000,
  workers: 1,
  reporter: 'list'
});
