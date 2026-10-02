// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { StorageEngine } from '../../src/main/storage/engine';
import { seedCompactCorpus } from '../e2e/compact-corpus';

it('opens the owned Compact corpus through the actual storage/settings engine', () => {
  const profile = mkdtempSync(path.join(tmpdir(), 'promptly-compact-corpus-'));
  let engine;

  try {
    seedCompactCorpus(profile);
    engine = new StorageEngine(path.join(profile, 'settings.sqlite'));
    expect(engine.run(1, 'getSettings', {}).result).toMatchObject({ ok: true });
    expect(
      engine.run(2, 'searchSnippets', {
        query: '',
        tagIds: [],
        untagged: false,
        sort: 'newest',
        offset: 0,
        limit: 200
      }).result
    ).toMatchObject({ ok: true, value: { total: 10_000, items: expect.any(Array) } });
  } finally {
    engine?.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
