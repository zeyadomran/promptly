import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { build } from 'vite';

export async function buildStorageWorker() {
  const directory = mkdtempSync(path.join(tmpdir(), 'promptly-worker-tests-'));
  const workerFile = path.join(directory, 'worker.cjs');

  await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: directory,
      emptyOutDir: false,
      lib: {
        entry: 'src/main/storage/storage-worker.ts',
        formats: ['cjs'],
        fileName: () => 'worker.cjs'
      },
      rollupOptions: { external: [/^node:/] }
    }
  });
  return {
    directory,
    workerFile,
    dispose: () => rmSync(directory, { recursive: true, force: true })
  };
}

export const query = {
  query: '',
  tagIds: [],
  untagged: false,
  sort: 'newest',
  offset: 0,
  limit: 200
};
