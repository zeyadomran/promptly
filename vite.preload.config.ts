import { defineConfig } from 'vite';

// Sandbox preloads cannot resolve local CommonJS files: bundle everything except Electron.
export default defineConfig({
  build: {
    rolldownOptions: {
      external: ['electron'],
      output: { codeSplitting: false, entryFileNames: 'preload.cjs' }
    }
  }
});
