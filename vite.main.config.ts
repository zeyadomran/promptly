import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: { main: 'src/main/main.ts', 'storage-worker': 'src/main/storage/storage-worker.ts' },
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.cjs`
    },
    rolldownOptions: { external: ['electron', 'koffi', /^node:/] }
  }
});
