import { build } from 'vite';

export async function buildIpcFixture(): Promise<void> {
  await build({
    configFile: false,
    define: {
      MAIN_WINDOW_VITE_DEV_SERVER_URL: 'undefined',
      MAIN_WINDOW_VITE_NAME: JSON.stringify('main_window')
    },
    build: {
      outDir: '.vite/build',
      emptyOutDir: false,
      lib: {
        entry: 'tests/e2e/fixtures/storage-native-wrapper.ts',
        formats: ['cjs'],
        fileName: () => 'ipc-fixture.cjs'
      },
      rollupOptions: { external: ['electron', /^node:/] }
    }
  });
}
