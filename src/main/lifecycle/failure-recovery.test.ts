import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { StorageClient } from '../storage/client';
import { createDesktopShutdown } from './desktop-shutdown';
import { createFailureRecovery, type RecoveryNotice } from './failure-recovery';

it('reports a dead storage owner once and rejects further commands without worker replay', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-storage-death-'));
  const worker = path.join(directory, 'controlled-worker.cjs');
  const failures: string[] = [];
  const effects: string[] = [];
  let answer: ((choice: 'restart' | 'quit') => void) | undefined;
  let completeCleanup: (() => void) | undefined;
  let recovered: Promise<void> | undefined;
  let notice: RecoveryNotice | undefined;
  let exited: (() => void) | undefined;
  const exitObserved = new Promise<void>((resolve) => {
    exited = resolve;
  });
  const shutdown = createDesktopShutdown({
    cleanup: () =>
      new Promise<void>((resolve) => {
        effects.push('cleanup');
        completeCleanup = resolve;
      }),
    exit: (code) => {
      effects.push(`exit ${String(code)}`);
      exited?.();
    },
    quit: () => effects.push('quit'),
    onError: () => effects.push('cleanup error')
  });
  const recovery = createFailureRecovery({
    directory: () => directory,
    stopCommands: () => effects.push('commands stopped'),
    show: (value) => {
      notice = value;
      effects.push('notice visible');
      return new Promise((resolve) => {
        answer = resolve;
      });
    },
    fallback: () => effects.push('fallback visible'),
    relaunch: () => effects.push('restart requested'),
    fatal: shutdown.fatal
  });

  await writeFile(
    worker,
    `
    const { parentPort } = require('node:worker_threads');
    parentPort.postMessage({ id: 0, result: { ok: true, value: { revision: 0 } } });
    parentPort.on('message', () => process.exit(7));
  `
  );
  const client = new StorageClient(
    worker,
    path.join(directory, 'unused.sqlite'),
    undefined,
    (error) => {
      failures.push(error.message);
      recovered = recovery.storage();
    }
  );

  try {
    await client.ready;
    await expect(client.call('getRevision', {})).rejects.toThrow('Local storage worker stopped.');
    await expect(client.call('getRevision', {})).rejects.toThrow('Local storage worker stopped.');
    expect(failures).toEqual(['Local storage worker stopped.']);
    expect(effects).toEqual(['commands stopped', 'notice visible']);
    expect(notice?.message).toBe('Local storage stopped. Restart or quit Promptly.');
    expect(notice?.detail).toContain(
      'The last operation may already be saved. It will not be retried.'
    );
    expect(notice?.detail).toContain(directory);
    expect(recovery.storage()).toBe(recovered);
    answer?.('restart');
    await recovered;
    expect(effects).toEqual(['commands stopped', 'notice visible', 'restart requested', 'cleanup']);
    completeCleanup?.();
    await exitObserved;
    expect(effects.at(-1)).toBe('exit 1');
  } finally {
    await client.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
