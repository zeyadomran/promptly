import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
      output: { codeSplitting: false, entryFileNames: 'capture-toast-preload.cjs' }
    }
  }
});
