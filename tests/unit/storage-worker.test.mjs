// @vitest-environment node
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildStorageWorker, query } from './storage-worker-fixture.mjs';

let fixture;
let directory;
let workerFile;

beforeAll(async () => {
  fixture = await buildStorageWorker();
  directory = fixture.directory;
  workerFile = fixture.workerFile;
});
afterAll(() => fixture.dispose());

describe('serialized database worker', () => {
  it('serializes concurrent recaptures, commits ordered events, drains submitted writes and reopens revision', async () => {
    const changes = [];
    const filename = path.join(directory, 'concurrent.sqlite');
    const client = fixture.createClient(workerFile, filename, (event) => changes.push(event));

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
      const reopened = fixture.createClient(workerFile, filename);

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

  it('fails startup and shutdown predictably when storage cannot be opened', async () => {
    const client = fixture.createClient(
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
    const client = fixture.createClient(crashFile, 'unused');

    await client.ready;
    await expect(client.call('getRevision', {})).rejects.toThrow('stopped');
    await expect(client.call('getRevision', {})).rejects.toThrow('stopped');
    await client.close();
  });
});
