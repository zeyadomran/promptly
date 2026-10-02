// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';

import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { StorageClient } from '../../src/main/storage/client';

const query = { query: '', tagIds: [], untagged: false, sort: 'newest', offset: 0, limit: 200 };
let directory;
let workerFile;

beforeAll(async () => {
  directory = mkdtempSync(path.join(tmpdir(), 'promptly-worker-tests-'));
  workerFile = path.join(directory, 'worker.cjs');
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
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('serialized database worker', () => {
  it('serializes concurrent recaptures, commits ordered events, drains submitted writes and reopens revision', async () => {
    const changes = [];
    const filename = path.join(directory, 'concurrent.sqlite');
    const client = new StorageClient(workerFile, filename, (event) => changes.push(event));

    try {
      expect(await client.ready).toBe(0);
      const captures = await Promise.all(
        Array.from({ length: 100 }, () =>
          client.call('captureSnippet', {
            text: 'shared 👋\ntext',
            sourceApp: 'Terminal',
            sourceAppId: 'Terminal.exe'
          })
        )
      );
      const ids = new Set(
        captures.map((result) => {
          expect(result.ok).toBe(true);
          if (!result.ok || result.value.status === 'empty') throw new Error('Capture failed');
          return result.value.snippet.id;
        })
      );

      expect(ids.size).toBe(1);
      expect(changes.map((change) => change.revision)).toEqual(
        Array.from({ length: 100 }, (_, index) => index + 1)
      );
      const id = [...ids][0];
      const copies = Array.from({ length: 50 }, () => client.call('recordSuccessfulCopy', { id }));

      await setImmediate();
      const closing = client.close();

      expect(client.close()).toBe(closing);
      expect((await Promise.all(copies)).every((result) => result.ok)).toBe(true);
      await closing;
      await expect(client.call('getRevision', {})).rejects.toThrow('closed');
      const reopened = new StorageClient(workerFile, filename);

      try {
        expect(await reopened.ready).toBe(150);
        expect(await reopened.call('searchSnippets', query)).toMatchObject({
          ok: true,
          value: { revision: 150, total: 1, items: [{ id, copyCount: 50 }] }
        });
      } finally {
        await reopened.close();
      }
    } finally {
      await client.close();
    }
  });

  it('drains a saturated ordinary queue during shutdown and rejects any further work', async () => {
    const filename = path.join(directory, 'saturated.sqlite');
    const client = new StorageClient(workerFile, filename);

    try {
      await client.ready;
      const writes = Array.from({ length: 1000 }, (_, index) =>
        client.call('createSnippet', { text: `Accepted ${index}` })
      );
      const completion = Promise.allSettled(writes);

      await Promise.resolve();
      await expect(client.call('createSnippet', { text: 'Queue overflow' })).rejects.toThrow(
        'queue is full'
      );
      const closing = client.close();

      await expect(client.call('createSnippet', { text: 'After shutdown' })).rejects.toThrow(
        'closed'
      );
      await closing;
      const results = await completion;

      expect(results).toHaveLength(1000);
      expect(results.every((result) => result.status === 'fulfilled' && result.value.ok)).toBe(
        true
      );
      const reopened = new StorageClient(workerFile, filename);

      try {
        expect(await reopened.ready).toBe(1000);
        expect(await reopened.call('searchSnippets', query)).toMatchObject({
          ok: true,
          value: { revision: 1000, total: 1000 }
        });
      } finally {
        await reopened.close();
      }
    } finally {
      await client.close();
    }
  }, 10_000);

  it('fails startup and shutdown predictably when storage cannot be opened', async () => {
    const client = new StorageClient(
      workerFile,
      path.join(directory, 'nonexistent', 'data.sqlite')
    );

    await expect(client.ready).rejects.toThrow('Unable to open');
    await expect(client.close()).rejects.toThrow('Unable to open');
  });

  it('rejects in-flight and later work when the worker exits unexpectedly', async () => {
    const crashFile = path.join(directory, 'crash.cjs');

    writeFileSync(
      crashFile,
      `const {parentPort} = require('node:worker_threads');
      parentPort.postMessage({id:0,result:{ok:true,value:{revision:0}}});
      parentPort.on('message', () => process.exit(1));`
    );
    const client = new StorageClient(crashFile, 'unused');

    await client.ready;
    await expect(client.call('getRevision', {})).rejects.toThrow('stopped');
    await expect(client.call('getRevision', {})).rejects.toThrow('stopped');
    await client.close();
  });

  it('bounds shutdown when a worker does not reply', async () => {
    const hangingFile = path.join(directory, 'hanging.cjs');

    writeFileSync(
      hangingFile,
      `const {parentPort} = require('node:worker_threads');
      parentPort.postMessage({id:0,result:{ok:true,value:{revision:0}}});
      parentPort.on('message', () => {});`
    );
    const client = new StorageClient(hangingFile, 'unused');

    await client.ready;
    await expect(client.close()).rejects.toThrow('timed out');
  }, 10_000);
});
