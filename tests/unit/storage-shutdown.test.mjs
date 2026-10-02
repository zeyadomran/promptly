// @vitest-environment node
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildStorageWorker, query } from './storage-worker-fixture.mjs';

let fixture;

beforeAll(async () => {
  fixture = await buildStorageWorker();
});
afterAll(() => fixture.dispose());

function hangingClient(name) {
  const workerFile = path.join(fixture.directory, `${name}.cjs`);

  writeFileSync(
    workerFile,
    `const {parentPort} = require('node:worker_threads');
    parentPort.postMessage({id:0,result:{ok:true,value:{revision:0}}});
    parentPort.on('message', () => {});`
  );
  return fixture.createClient(workerFile, 'unused');
}

describe('bounded shutdown phases', () => {
  it('drains a saturated ordinary queue during shutdown and rejects any further work', async () => {
    const filename = path.join(fixture.directory, 'saturated.sqlite');
    const client = fixture.createClient(fixture.workerFile, filename);

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
      const reopened = fixture.createClient(fixture.workerFile, filename);

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
  }, 45_000);

  it('keeps an accepted real SQLite write alive beyond the close-control budget', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const filename = path.join(fixture.directory, 'locked.sqlite');
    const client = fixture.createClient(fixture.workerFile, filename);
    let lock;

    try {
      await client.ready;
      lock = new DatabaseSync(filename);
      lock.exec('BEGIN IMMEDIATE');
      const writing = client.call('createSnippet', { text: 'Accepted before shutdown' });

      await Promise.resolve();
      const closing = client.close();
      let settled = false;
      const outcome = closing.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        }
      );

      await vi.advanceTimersByTimeAsync(5001);
      expect(settled).toBe(false);
      lock.exec('COMMIT');
      expect(await writing).toMatchObject({ ok: true, value: { revision: 1 } });
      await closing;
      await outcome;
      expect(settled).toBe(true);
    } finally {
      lock?.close();
      await client.close();
      vi.useRealTimers();
    }
  });

  it('fails a stuck drain at the existing request deadline and terminates the worker', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const client = hangingClient('stuck-drain');

    try {
      await client.ready;
      const writing = client.call('getRevision', {});
      const writeError = writing.catch((error) => error.message);

      await Promise.resolve();
      const closing = client.close();
      const closeError = closing.catch((error) => error.message);
      let settled = false;
      const outcome = closing
        .finally(() => {
          settled = true;
        })
        .catch(() => undefined);

      await vi.advanceTimersByTimeAsync(29_999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await writeError).toContain('timed out');
      expect(await closeError).toContain('timed out');
      await outcome;
      expect(settled).toBe(true);
    } finally {
      await client.close().catch(() => undefined);
      vi.useRealTimers();
    }
  });

  it('bounds the empty-queue close-control phase at five seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const client = hangingClient('stuck-close');

    try {
      await client.ready;
      const closing = client.close();
      const failure = closing.catch((error) => error.message);
      let settled = false;
      const outcome = closing
        .finally(() => {
          settled = true;
        })
        .catch(() => undefined);

      await vi.advanceTimersByTimeAsync(4999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await failure).toContain('timed out');
      await outcome;
      expect(settled).toBe(true);
    } finally {
      await client.close().catch(() => undefined);
      vi.useRealTimers();
    }
  });
});
