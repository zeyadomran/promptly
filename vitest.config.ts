import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: process.env['CI'] !== 'true',
    // Functional flows include real disk/SQLite work on shared Windows runners.
    testTimeout: process.env['CI'] === 'true' ? 15_000 : 5_000,
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
