// @vitest-environment node
import { mkdtemp, open, readdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import type { PortableBackup } from '../../../shared/contracts/backup/format';
import { atomicExport } from './atomic-export';
import { encodeExport } from './encode-export';

let directory: string;
let destination: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'promptly-atomic-'));
  destination = path.join(directory, 'existing.json');
  await writeFile(destination, 'previous complete backup');
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

it.each(['write', 'flush', 'replace'] as const)(
  'preserves existing destination and cleans temporary files after %s failure',
  async (stage) => {
    const files = {
      open: async (filename: string) => {
        const handle = await open(filename, 'wx', 0o600);

        return {
          writeFile: async (data: Uint8Array) => {
            await handle.writeFile(stage === 'write' ? data.subarray(0, 2) : data);
            if (stage === 'write') throw new Error('Owned disk full.');
          },
          sync: async () => {
            if (stage === 'flush') throw new Error('Owned flush failure.');
            await handle.sync();
          },
          close: () => handle.close()
        };
      },
      rename: async (from: string, to: string) => {
        if (stage === 'replace') throw new Error('Owned replacement failure.');
        await rename(from, to);
      },
      unlink
    };

    await expect(
      atomicExport(
        destination,
        Buffer.from('complete replacement'),
        new AbortController().signal,
        files
      )
    ).rejects.toBeInstanceOf(AggregateError);
    expect(await readFile(destination, 'utf8')).toBe('previous complete backup');
    expect(await readdir(directory)).toEqual(['existing.json']);
  }
);

it('cancels before replacement and commits a fully flushed successful backup', async () => {
  const canceled = new AbortController();

  canceled.abort();
  await expect(
    atomicExport(destination, Buffer.from('cancel'), canceled.signal)
  ).rejects.toBeInstanceOf(AggregateError);
  expect(await readFile(destination, 'utf8')).toBe('previous complete backup');
  await atomicExport(destination, Buffer.from('complete'), new AbortController().signal);
  expect(await readFile(destination, 'utf8')).toBe('complete');
  expect(await readdir(directory)).toEqual(['existing.json']);
});

it('uses fences beyond embedded runs, complete text and UTF-16 fallback for lone surrogates', () => {
  const text = '😀\u0000\n```````\nend';
  const backup: PortableBackup = {
    format: 'promptly-library',
    version: 1,
    tags: [],
    memberships: [],
    snippets: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        text,
        createdAt: '2026-10-02T00:00:00.000Z',
        updatedAt: '2026-10-02T00:00:00.000Z',
        copyCount: 0,
        lastCopiedAt: null
      }
    ]
  };
  const markdown = Buffer.from(encodeExport(backup, 'markdown')).toString('utf8');

  expect(markdown).toContain(`\n${'`'.repeat(8)}text\n${text}\n${'`'.repeat(8)}\n`);
  const snippet = backup.snippets[0];

  if (snippet === undefined) throw new Error('Missing owned snippet.');
  snippet.text += '\ud800';
  expect(Buffer.from(encodeExport(backup, 'markdown')).toString('utf16le')).toContain(snippet.text);
  expect(JSON.parse(Buffer.from(encodeExport(backup, 'json')).toString('utf8'))).toEqual(backup);
});
