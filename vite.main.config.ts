import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: { main: 'src/main/main.ts', 'storage-worker': 'src/main/storage/storage-worker.ts' },
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.cjs`
    },
    rollupOptions: { external: ['electron', /^node:/] }
  }
});
