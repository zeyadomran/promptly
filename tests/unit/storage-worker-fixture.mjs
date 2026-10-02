import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { build } from 'vite';

import { StorageClient } from '../../src/main/storage/client';
import { ownStorageClients } from './storage-worker-owner.mjs';

export async function buildStorageWorker() {
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-worker-tests-'));
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
  const owner = ownStorageClients(
    (...args) => new StorageClient(...args),
    () => rm(directory, { recursive: true, force: true })
  );

  return {
    directory,
    workerFile,
    createClient: owner.createClient,
    dispose: owner.dispose
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
