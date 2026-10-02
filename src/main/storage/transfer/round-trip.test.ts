// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { allSnippets } from '../storage-test-fixture';
import { transferStore } from './transfer-test-fixture';

let source: ReturnType<typeof transferStore>;
let destination: ReturnType<typeof transferStore>;

beforeEach(() => {
  source = transferStore();
  destination = transferStore();
});
afterEach(() => {
  source.dispose();
  destination.dispose();
});

it('round trips exact UTF-16 text, duplicate texts, dates, tags and copy metadata into a fresh profile', () => {
  const text = '😀\u0000NUL\n```\nfull text\ud800\udfff';
  const first = source.invoke('createSnippet', { text }).snippet;
  const tag = source.invoke('createTag', { name: 'résumé 😀', color: 'amber' }).tag;

  source.invoke('setSnippetTags', { id: first.id, tagIds: [tag.id] });
  source.invoke('recordSuccessfulCopy', { id: first.id });
  source.invoke('duplicateSnippet', { id: first.id });
  const backup = source.export();
  const preview = destination.prepare(backup);

  expect(preview).toMatchObject({ snippets: 2, tags: 1, memberships: 2, remappedSnippetIds: 0 });
  destination.invoke('commitLibraryImport', { token: preview.token, revision: preview.revision });
  destination.reopen();
  expect(destination.export()).toEqual(backup);
  expect(destination.invoke('getSnippet', { id: first.id }).snippet.text).toBe(text);
  expect(destination.invoke('searchSnippets', allSnippets).total).toBe(2);
});

it('remaps conflicting IDs, coalesces tag names and unions memberships without deduplicating text', () => {
  const existing = destination.invoke('createSnippet', { text: 'existing' }).snippet;
  const work = destination.invoke('createTag', { name: 'work' }).tag;
  const other = destination.invoke('createTag', { name: 'other' }).tag;
  const imported = source.invoke('createSnippet', { text: 'existing' }).snippet;
  const date = imported.createdAt;
  const backup = {
    ...source.export(),
    snippets: [{ ...source.export().snippets[0], id: existing.id }],
    tags: [
      { ...work, id: randomUUID() },
      { ...work, id: randomUUID() },
      { ...other, name: 'new' }
    ]
  };

  backup.memberships = backup.tags.map((tag) => ({ snippetId: existing.id, tagId: tag.id }));
  const preview = destination.prepare(backup);

  expect(preview).toMatchObject({ remappedSnippetIds: 1, remappedTagIds: 1, coalescedTags: 2 });
  destination.invoke('commitLibraryImport', { token: preview.token, revision: preview.revision });
  const snippets = destination.invoke('searchSnippets', allSnippets).items;
  const added = snippets.find((snippet) => snippet.id !== existing.id);

  expect(added).toMatchObject({ text: 'existing', createdAt: date });
  expect(added?.tags.map((tag) => tag.name).sort()).toEqual(['new', 'work']);
  expect(snippets).toHaveLength(2);
  expect(destination.invoke('listTags', {}).tags).toHaveLength(3);
});

it('compares raw UTF-16 during recapture even when SQLite UTF-8 and hashes collide', () => {
  const first = source.invoke('createSnippet', { text: 'x\ud800' }).snippet;
  const second = source.invoke('createSnippet', { text: 'x\ud801' }).snippet;

  expect(
    source.invoke('captureSnippet', { text: first.text, sourceApp: null, sourceAppId: null })
  ).toMatchObject({ status: 'duplicate', snippet: { id: first.id, text: first.text } });
  expect(source.invoke('getSnippet', { id: second.id }).snippet.text).toBe(second.text);
});
