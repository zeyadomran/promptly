import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'vite';

export async function buildIpcFixture(): Promise<void> {
  const url = pathToFileURL(path.resolve('.vite/ipc-fixture/index.html')).href;

  await build({
    configFile: false,
    root: path.resolve('tests/e2e/fixtures'),
    base: './',
    build: { outDir: path.resolve('.vite/ipc-fixture'), emptyOutDir: true }
  });
  await build({
    configFile: false,
    define: {
      MAIN_WINDOW_VITE_DEV_SERVER_URL: JSON.stringify(url),
      MAIN_WINDOW_VITE_NAME: JSON.stringify('main_window')
    },
    build: {
      outDir: '.vite/build',
      emptyOutDir: false,
      lib: {
        entry: 'tests/e2e/fixtures/ipc-main.ts',
        formats: ['cjs'],
        fileName: () => 'ipc-fixture.cjs'
      },
      rollupOptions: { external: ['electron', 'node:path', 'node:url'] }
    }
  });
}
