import path from 'node:path';

import { build } from 'vite';

export async function buildMacosActivation() {
  const directory = path.resolve('tests/native/macos/out');

  await build({
    configFile: false,
    build: {
      outDir: directory,
      emptyOutDir: false,
      lib: {
        entry: path.resolve('tests/e2e/fixtures/macos-activation-main.ts'),
        formats: ['cjs'],
        fileName: () => 'activation-harness.cjs'
      },
      rollupOptions: { external: [/^node:/] }
    }
  });
  return path.join(directory, 'activation-harness.cjs');
}
