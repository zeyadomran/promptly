// @vitest-environment node
import { existsSync } from 'node:fs';
import path from 'node:path';

import { expect, it, vi } from 'vitest';

import { buildStorageWorker } from './storage-worker-fixture.mjs';
import { ownStorageClients } from './storage-worker-owner.mjs';

it('after a deferred operation times out, independent teardown awaits a real worker exit before removal', async () => {
  const fixture = await buildStorageWorker();
  const client = fixture.createClient(
    fixture.workerFile,
    path.join(fixture.directory, 'owned.sqlite')
  );
  let finishBody;
  let bodyFinally = false;
  const deferred = new Promise((resolve) => {
    finishBody = resolve;
  });

  await client.ready;
  const body = (async () => {
    try {
      await deferred;
    } finally {
      bodyFinally = true;
      await client.close();
    }
  })();
  let timer;

  try {
    await expect(
      Promise.race([
        body,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Owned deferred operation timed out.')), 20);
        })
      ])
    ).rejects.toThrow('timed out');
    const closing = fixture.dispose();

    expect(fixture.dispose()).toBe(closing);
    expect(bodyFinally).toBe(false);
    expect(() => fixture.createClient(fixture.workerFile, 'late.sqlite')).toThrow('retired');
    expect(await closing).toEqual({
      clients: 1,
      terminationObserved: true,
      directoryRemoved: true
    });
    expect(client.worker.threadId).toBe(-1);
    expect(existsSync(fixture.directory)).toBe(false);
  } finally {
    clearTimeout(timer);
    finishBody();
    await body;
    await fixture.dispose();
  }
});

it('attempts every close and retains a pending failure while delaying deletion until all clients exit', async () => {
  let finishSecond;
  const failure = new Error('Owned pending close failed');
  const first = { worker: { threadId: -1 }, close: vi.fn(() => Promise.reject(failure)) };
  const second = {
    worker: { threadId: 2 },
    close: vi.fn(
      () =>
        new Promise((resolve) => {
          finishSecond = () => {
            second.worker.threadId = -1;
            resolve();
          };
        })
    )
  };
  const remove = vi.fn();
  const firstClose = first.close;
  const secondClose = second.close;
  const owner = ownStorageClients((name) => (name === 'first' ? first : second), remove);

  owner.createClient('first');
  owner.createClient('second');
  const closing = owner.dispose();
  const observed = closing.catch((error) => error);

  expect(firstClose).toHaveBeenCalledOnce();
  expect(secondClose).toHaveBeenCalledOnce();
  expect(remove).not.toHaveBeenCalled();
  finishSecond();
  const error = await observed;

  expect(error).toBeInstanceOf(AggregateError);
  expect(error.errors).toEqual([failure]);
  expect(remove).toHaveBeenCalledOnce();
  expect(owner.dispose()).toBe(closing);
});

it('does not repeat an already settled expected close error but still requires observed termination', async () => {
  const client = {
    worker: { threadId: -1 },
    close: () => Promise.reject(new Error('Expected startup rejection'))
  };
  const remove = vi.fn();
  const owner = ownStorageClients(() => client, remove);

  owner.createClient();
  await expect(client.close()).rejects.toThrow('Expected startup rejection');
  expect(await owner.dispose()).toMatchObject({ terminationObserved: true });
  expect(remove).toHaveBeenCalledOnce();
});
