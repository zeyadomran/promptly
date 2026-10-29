import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      external: ['electron'],
      output: { codeSplitting: false, entryFileNames: 'capture-toast-preload.cjs' }
    }
  }
});
