// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { build } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';

import type { ChangeEvent, SearchRequest } from '../../shared/contracts/domain';
import { WindowRegistry } from '../ipc/window-registry';
import { StorageClient } from '../storage/client';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { searchPreviewFlow } from './search-preview-test-fixture';

let directory: string | undefined;
let client: StorageClient | undefined;
let rejectPublication = false;
const published: ChangeEvent[] = [];
const subscribers = new WindowRegistry();

function subscribe(id: number, send: (_channel: string, value: ChangeEvent) => void): void {
  const contents = {
    id,
    mainFrame: { url: 'https://promptly.invalid/' },
    isDestroyed: () => false,
    once: () => undefined,
    on: () => undefined,
    send
  } as unknown as WebContents;

  subscribers.register(contents, 'https://promptly.invalid/');
  subscribers.subscribe({
    sender: contents,
    senderFrame: contents.mainFrame
  } as IpcMainInvokeEvent);
}

beforeAll(async () => {
  subscribe(1, () => {
    if (rejectPublication) throw new Error('Controlled subscriber failure');
  });
  subscribe(2, (_channel, change) => published.push(change));
  directory = await mkdtemp(path.join(tmpdir(), 'promptly-search-contract-'));
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
  client = new StorageClient(
    path.join(directory, 'worker.cjs'),
    path.join(directory, 'data.sqlite'),
    (change) => {
      subscribers.broadcast('owned-change', change);
    }
  );
  await client.ready;
}, 30_000);

afterAll(async () => {
  // close observes worker termination before its exclusively owned files are removed.
  await client?.close();
  if (directory !== undefined) await rm(directory, { recursive: true, force: true });
}, 45_000);

async function call<K extends StorageOperation>(
  operation: K,
  request: StorageRequest<K>
): Promise<StorageResponse<K>> {
  if (client === undefined) throw new Error('Search worker was not initialized.');
  const result = await client.call(operation, request);

  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

it('searches literal text with AND filters, sorted pages and committed invalidation through a real worker', async () => {
  const one = (await call('createTag', { name: 'code review' })).tag;
  const two = (await call('createTag', { name: 'testing' })).tag;
  const text = 'A review %b_c 你好\u0000tail';
  const rows = [];

  for (const [content, sourceApp] of [
    [text, 'Terminal'],
    ['B review %b_c', 'Terminal'],
    ['C review %b_c', 'Terminal'],
    ['D review %b_c', 'Editor']
  ] as const) {
    const captured = await call('captureSnippet', {
      text: content,
      sourceApp,
      sourceAppId: `${sourceApp}.exe`
    });

    if (captured.status === 'empty') throw new Error('Expected owned snippet.');
    rows.push(captured.snippet);
  }

  const [a, b, c, d] = rows;

  if (a === undefined || b === undefined || c === undefined || d === undefined)
    throw new Error('Expected four owned snippets.');
  for (const row of [a, b, d])
    await call('setSnippetTags', { id: row.id, tagIds: [one.id, two.id] });
  await call('setSnippetTags', { id: c.id, tagIds: [one.id] });
  await call('recordSuccessfulCopy', { id: b.id });
  expect(published.at(-1)).toMatchObject({ copyStatistics: { id: b.id, copyCount: 1 } });
  const request: SearchRequest = {
    query: 'tag:"CODE REVIEW" tag:testing from:terminal "%b_c" review',
    tagIds: [one.id, two.id],
    untagged: false,
    sort: 'most-copied',
    offset: 0,
    limit: 1
  };
  const first = await call('searchSnippets', request);
  const second = await call('searchSnippets', { ...request, offset: 1 });

  expect(first).toMatchObject({ total: 2, offset: 0, hasMore: true, items: [{ id: b.id }] });
  expect(second).toMatchObject({
    total: 2,
    offset: 1,
    hasMore: false,
    items: [{ id: a.id, text }]
  });
  expect(second.matches?.[a.id]).toContainEqual({ start: 9, end: 13 });
  await call('updateSnippet', { id: b.id, text: 'B changed' });
  const changed = await call('searchSnippets', request);

  expect(changed).toMatchObject({ total: 1, hasMore: false, items: [{ id: a.id, text }] });
  expect(changed.revision).toBeGreaterThan(first.revision);
  await call('setSnippetTags', { id: c.id, tagIds: [] });
  const untagged = await call('searchSnippets', {
    ...request,
    query: '',
    tagIds: [],
    untagged: true
  });

  expect(untagged).toMatchObject({ total: 1, items: [{ id: c.id, text: 'C review %b_c' }] });
  rejectPublication = true;
  expect(
    await call('updateSnippet', { id: c.id, text: 'Committed despite subscriber failure' })
  ).toMatchObject({ snippet: { id: c.id, text: 'Committed despite subscriber failure' } });
  expect(await call('getSnippet', { id: c.id })).toMatchObject({
    snippet: { text: 'Committed despite subscriber failure' }
  });
  expect(published.at(-1)?.revision).toBe(14);
  expect(published.at(-1)?.domains).toEqual(['snippets', 'tags', 'attachments']);
  await client?.close();
  if (directory === undefined) throw new Error('Expected owned worker directory.');
  client = new StorageClient(
    path.join(directory, 'worker.cjs'),
    path.join(directory, 'data.sqlite')
  );
  await client.ready;
  expect(await call('getSnippet', { id: c.id })).toMatchObject({
    snippet: { text: 'Committed despite subscriber failure' }
  });
  const large = 'a '.repeat(499_990) + '😀 hidden-needle';

  await call('updateSnippet', { id: c.id, text: large });
  const hidden = await call('searchSnippets', { ...request, query: 'hidden-needle', tagIds: [] });

  expect(hidden.total).toBe(1);
  expect(hidden.items[0]?.text).toHaveLength(1_024);
  expect(hidden.matches?.[c.id]).toEqual([]);
  const repeated = await call('searchSnippets', {
    ...request,
    query: 'a hidden-needle',
    tagIds: []
  });

  expect(repeated.matches?.[c.id]).toHaveLength(64);
  expect(await call('getSnippet', { id: c.id })).toMatchObject({ snippet: { text: large } });
  await searchPreviewFlow(call, c.id, request);
});
