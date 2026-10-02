// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'vitest';

import { StorageEngine } from '../../src/main/storage/engine';
import { searchCorpusText, seedSearchCorpus } from '../e2e/search-corpus';
import { query } from './storage-worker-fixture.mjs';

test('current-schema corpus retains 10k complete UTF-16 texts and exact NUL suffix matches', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'promptly-search-seed-'));
  const filename = path.join(directory, 'search.sqlite');
  let engine;

  try {
    expect(seedSearchCorpus(filename).count).toBe(10_000);
    engine = new StorageEngine(filename);
    const result = engine.run(1, 'searchSnippets', {
      ...query,
      query: '\u0000END needle-0'
    }).result;

    expect(result.ok).toBe(true);
    expect(result.value.total).toBe(1);
    expect(result.value.items[0].text).toBe(searchCorpusText(0));
    expect(engine.run(2, 'searchSnippets', query).result.value.total).toBe(10_000);
  } finally {
    engine?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
