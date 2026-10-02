// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { truncateSync, writeFileSync } from 'node:fs';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { backupLimits } from '../../../shared/contracts/backup/format';
import { transferStore } from './transfer-test-fixture';

let store: ReturnType<typeof transferStore>;
const blank = () => ({
  format: 'promptly-library',
  version: 1,
  snippets: [],
  tags: [],
  memberships: []
});

beforeEach(() => {
  store = transferStore();
});
afterEach(() => {
  store.dispose();
});

it.each([
  { ...blank(), version: 2 },
  { ...blank(), machinePath: 'not portable' },
  { ...blank(), memberships: [{ snippetId: randomUUID(), tagId: randomUUID() }] },
  {
    ...blank(),
    tags: [
      { id: randomUUID(), name: 'x\ud800', color: 'blue', createdAt: '2026-10-02T00:00:00.000Z' }
    ]
  },
  {
    ...blank(),
    tags: [{ id: randomUUID(), name: 'tag', color: 'blue', createdAt: '2026-02-31T00:00:00.000Z' }]
  }
])('rejects malformed/unsupported records before writes or revision changes', (backup) => {
  store.invoke('createSnippet', { text: 'kept' });
  const previous = store.export();
  const revision = store.engine.context.revision();

  writeFileSync(store.file, JSON.stringify(backup));
  expect(store.engine.run(1, 'prepareLibraryImport', { filename: store.file })).toMatchObject({
    result: { ok: false, error: { code: 'INVALID_REQUEST' } }
  });
  expect(store.engine.context.revision()).toBe(revision);
  expect(store.export()).toEqual(previous);
});

it('rejects invalid UTF-8 and actual file bytes beyond the limit, independently of a size hint', () => {
  writeFileSync(store.file, Buffer.from([0xff, 0xfe]));
  expect(
    store.engine.run(1, 'prepareLibraryImport', { filename: store.file }).result
  ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  truncateSync(store.file, backupLimits.bytes + 1);
  expect(
    store.engine.run(1, 'prepareLibraryImport', { filename: store.file }).result
  ).toMatchObject({
    ok: false,
    error: { code: 'INVALID_REQUEST', message: 'Backup exceeds the 64 MiB limit.' }
  });
  expect(store.engine.context.revision()).toBe(0);
});

it('binds confirmation to immutable loaded content and rejects a stale revision without writes', () => {
  const snippet = store.invoke('createSnippet', { text: 'immutable' }).snippet;
  const backup = store.export();

  store.invoke('clearLibrary', {});
  const preview = store.prepare(backup);

  writeFileSync(store.file, JSON.stringify(blank()));
  store.invoke('commitLibraryImport', { token: preview.token, revision: preview.revision });
  expect(store.invoke('getSnippet', { id: snippet.id }).snippet.text).toBe('immutable');
  const stale = store.prepare(backup);

  store.invoke('createSnippet', { text: 'newer' });
  const revision = store.engine.context.revision();
  const reply = store.engine.run(1, 'commitLibraryImport', {
    token: stale.token,
    revision: stale.revision
  });

  expect(reply.result).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  expect(reply.change).toBeUndefined();
  expect(store.engine.context.revision()).toBe(revision);
});

it('rolls back every inserted record, membership and revision when storage fails midway', () => {
  store.invoke('createSnippet', { text: 'first' });
  store.invoke('createSnippet', { text: 'second' });
  const backup = store.export();

  store.invoke('clearLibrary', {});
  const preview = store.prepare(backup);
  const revision = store.engine.context.revision();

  store.engine.context.db.exec(`CREATE TRIGGER reject_import BEFORE INSERT ON snippets
    WHEN (SELECT COUNT(*) FROM snippets) > 0 BEGIN SELECT RAISE(ABORT, 'owned failure'); END;`);
  const failed = store.engine.run(1, 'commitLibraryImport', {
    token: preview.token,
    revision: preview.revision
  });

  expect(failed.result.ok).toBe(false);
  expect(failed.change).toBeUndefined();
  expect(store.engine.context.revision()).toBe(revision);
  expect(store.export()).toEqual(blank());
  store.engine.context.db.exec('DROP TRIGGER reject_import');
  const completed = store.engine.run(1, 'commitLibraryImport', {
    token: preview.token,
    revision: preview.revision
  });

  expect(completed.change).toEqual({ revision: revision + 1, domains: ['snippets', 'tags'] });
  expect(store.export()).toEqual(backup);
  expect(
    store.engine.run(1, 'commitLibraryImport', { token: preview.token, revision: preview.revision })
      .result
  ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
});
