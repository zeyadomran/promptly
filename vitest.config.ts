import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: process.env['CI'] !== 'true',
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
