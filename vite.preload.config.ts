import { defineConfig } from 'vite';

// Sandbox preloads cannot resolve local CommonJS files: bundle everything except Electron.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
      output: { codeSplitting: false, entryFileNames: 'preload.cjs' }
    }
  }
});
