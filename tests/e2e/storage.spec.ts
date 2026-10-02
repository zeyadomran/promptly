import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchIsolatedElectron } from '../isolated-electron';

test('packaged asar worker loads SQLite, persists full text, and reopens durable revision', async () => {
  const directory = path.resolve('out', `Promptly-${process.platform}-${process.arch}`);
  const executablePath =
    process.platform === 'darwin'
      ? path.join(directory, 'Promptly.app', 'Contents', 'MacOS', 'Promptly')
      : path.join(directory, 'Promptly.exe');
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }

  delete env.ELECTRON_RUN_AS_NODE;
  const temporary = await mkdtemp(path.join(tmpdir(), 'promptly-packaged-storage-'));
  const databaseFile = path.join(temporary, 'smoke.sqlite');
  const isolated = await launchIsolatedElectron(executablePath, env);
  const application = isolated.application;

  try {
    await application.firstWindow();
    const result = await application.evaluate(async ({ app }, filename) => {
      // Test-only controller: exercise the actual packaged worker with an isolated database.
      const { Worker } = process.getBuiltinModule('node:worker_threads');
      const { join } = process.getBuiltinModule('node:path');
      const workerFile = join(app.getAppPath(), '.vite/build/storage-worker.cjs');
      const text = `你好 👋 مرحبا\n${'full text\n'.repeat(1000)}\u0000end`;
      const revisions: number[] = [];

      async function session(reopen: boolean) {
        const worker = new Worker(workerFile, { workerData: filename });
        let id = 1;
        const pending = new Map<number, (value: unknown) => void>();
        const ready = new Promise<unknown>((resolve) => pending.set(0, resolve));

        worker.on(
          'message',
          (reply: { id: number; result: unknown; change?: { revision: number } }) => {
            if (reply.change !== undefined) revisions.push(reply.change.revision);
            pending.get(reply.id)?.(reply.result);
            pending.delete(reply.id);
          }
        );
        const request = (operation: string, input: unknown): Promise<unknown> =>
          new Promise((resolve) => {
            const requestId = id++;

            pending.set(requestId, resolve);
            worker.postMessage({ id: requestId, operation, input });
          });

        try {
          const startup = await ready;

          if (!reopen) {
            const saved = await request('captureSnippet', {
              text,
              sourceApp: 'Smoke',
              sourceAppId: null
            });
            const again = await request('captureSnippet', {
              text,
              sourceApp: 'Smoke',
              sourceAppId: null
            });
            const blank = await request('captureSnippet', {
              text: ' \n',
              sourceApp: null,
              sourceAppId: null
            });

            return { startup, saved, again, blank };
          }

          const page = await request('searchSnippets', {
            query: '',
            tagIds: [],
            untagged: false,
            sort: 'newest',
            offset: 0,
            limit: 10
          });

          return { startup, page };
        } finally {
          await request('close', {});
          await worker.terminate();
        }
      }

      return {
        first: await session(false),
        second: await session(true),
        text,
        revisions,
        versions: process.versions
      };
    }, databaseFile);

    expect(result.versions.electron).toBe('44.5.1');
    expect(result.versions.sqlite).toBeTruthy();
    expect(result.first).toMatchObject({
      startup: { ok: true, value: { revision: 0 } },
      saved: { ok: true, value: { status: 'saved', revision: 1, snippet: { text: result.text } } },
      again: {
        ok: true,
        value: { status: 'duplicate', revision: 2, snippet: { text: result.text } }
      },
      blank: { ok: true, value: { status: 'empty', revision: 2 } }
    });
    expect(result.second).toMatchObject({
      startup: { ok: true, value: { revision: 2 } },
      page: { ok: true, value: { total: 1, revision: 2, items: [{ text: result.text }] } }
    });
    expect(result.revisions).toEqual([1, 2]);
  } finally {
    await isolated.dispose();
    await rm(temporary, { recursive: true, force: true });
  }
});
