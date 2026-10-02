// @vitest-environment node
import path from 'node:path';

import { expect, test } from 'vitest';

import { StorageClient } from '../../src/main/storage/client';
import { buildStorageWorker, query } from './storage-worker-fixture.mjs';

test('25ms logging observer cannot precede worker post or resolved response; disabled diagnostics stay absent', async () => {
  const fixture = await buildStorageWorker();
  let resolved = false;
  const observed = [];
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  const client = new StorageClient(
    fixture.workerFile,
    path.join(fixture.directory, 'diagnostic.sqlite'),
    () => {},
    (event) => {
      expect(resolved).toBe(true);
      Atomics.wait(sleeper, 0, 0, 25);
      observed.push(event);
    }
  );
  const disabled = new StorageClient(
    fixture.workerFile,
    path.join(fixture.directory, 'disabled.sqlite')
  );

  try {
    await client.ready;
    expect((await client.call('searchSnippets', query)).ok).toBe(true);
    resolved = true;
    expect(observed).toEqual([]);
    const receipt = client.flushDiagnostics();

    expect(observed).toHaveLength(4);
    expect(receipt.events.map(({ phase }) => phase)).toEqual([
      'main-post',
      'worker-receive',
      'worker-send',
      'main-receive'
    ]);
    // Slow observer work occurred after every stored stamp, never inside the measured interval.
    expect(observed.every((event) => event.epochMs <= receipt.events[3].epochMs)).toBe(true);
    expect((await disabled.call('searchSnippets', query)).ok).toBe(true);
    expect(disabled.flushDiagnostics()).toBeUndefined();
  } finally {
    await Promise.allSettled([client.close(), disabled.close()]);
    fixture.dispose();
  }
});
