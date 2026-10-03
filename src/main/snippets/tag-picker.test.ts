import { expect, it, vi } from 'vitest';

import { TagPickerController } from '../../renderer/features/tags/tag-picker-controller';
import type { ChangeEvent } from '../../shared/contracts/domain';
import type { DesktopResult } from '../../shared/contracts/result';
import { resultSchema } from '../../shared/contracts/result';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { storageOperations } from '../storage/protocol';
import { allSnippets, testStorage } from '../storage/storage-test-fixture';

it('creates and edits tags on the captured snippet with authoritative names, memberships and revisions', async () => {
  const storage = testStorage();
  const listeners = new Set<(change: ChangeEvent) => void>();
  let release: (() => void) | undefined;
  let held: Promise<void> | undefined;
  const invoke = <K extends StorageOperation>(operation: K, input: StorageRequest<K>) => {
    const reply = storage.engine.run(1, operation, input);

    if (reply.change !== undefined) for (const listener of listeners) listener(reply.change);
    return resultSchema<unknown>(storageOperations[operation].response).parse(
      reply.result
    ) as DesktopResult<StorageResponse<K>>;
  };

  const saved = (text: string) => {
    const result = invoke('createSnippet', { text });

    if (!result.ok || !('snippet' in result.value)) throw new Error('Owned snippet unavailable');
    return result.value.snippet;
  };

  const first = saved('First owned snippet');
  const second = saved('Second owned snippet');
  const picker = new TagPickerController({
    getSnippet: (input) => Promise.resolve(invoke('getSnippet', input)),
    ensureTag: async (input) => {
      await held;
      return invoke('ensureTag', input);
    },
    setTagMembership: (input) => Promise.resolve(invoke('setTagMembership', input)),
    subscribeChanges: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  });

  try {
    picker.start();
    await picker.openSnippet(first.id);
    picker.query('  WoRK  ');
    const [, reused] = await Promise.all([
      picker.create(),
      Promise.resolve().then(() => invoke('ensureTag', { name: ' WORK ', snippetId: first.id }))
    ]);
    const tags = invoke('listTags', {});

    if (!tags.ok || !('tags' in tags.value)) throw new Error('Owned tags unavailable');
    const work = tags.value.tags[0];

    if (work === undefined) throw new Error('Owned tag unavailable');
    expect(work).toMatchObject({ name: 'work', color: 'blue', snippetCount: 1 });
    expect(picker.snapshot().selectedIds).toEqual([work.id]);
    expect(reused).toMatchObject({ ok: true, value: { tag: { id: work.id } } });
    await vi.waitFor(() => {
      expect(picker.snapshot().loading).toBe(false);
    });
    picker.query('work');
    expect(picker.matches(tags.value.tags).map((tag) => tag.id)).toEqual([work.id]);
    storage.reopen();
    expect(invoke('listTags', {})).toMatchObject({
      ok: true,
      value: { tags: [{ id: work.id, name: 'work', snippetCount: 1 }] }
    });
    picker.query('project\0one');
    await picker.create();
    const nul = invoke('ensureTag', { name: 'project\0two', snippetId: first.id });

    if (!nul.ok || !('tag' in nul.value)) throw new Error('Owned NUL tag unavailable');
    expect(nul.value.tag).toMatchObject({ name: 'project\0one', color: 'green' });
    const members = invoke('getSnippet', { id: first.id });

    expect(members).toMatchObject({
      ok: true,
      value: { snippet: { tags: [{ id: work.id }, { id: nul.value.tag.id }] } }
    });
    await vi.waitFor(() => {
      expect(picker.snapshot().loading).toBe(false);
    });
    picker.query('');
    const ordered = invoke('listTags', {});

    if (!ordered.ok) throw new Error('Owned catalog unavailable');
    expect(picker.matches(ordered.value.tags).map((tag) => tag.id)).toEqual([
      work.id,
      nul.value.tag.id
    ]);
    picker.query('o');
    expect(picker.matches(ordered.value.tags).map((tag) => tag.id)).toEqual([
      work.id,
      nul.value.tag.id
    ]);
    storage.reopen();
    expect(invoke('getSnippet', { id: first.id })).toMatchObject({
      ok: true,
      value: { snippet: { tags: [{ id: work.id }, { id: nul.value.tag.id }] } }
    });
    held = new Promise<void>((resolve) => {
      release = resolve;
    });
    picker.query('Later');
    const accepted = picker.create();

    await picker.openSnippet(second.id);
    release?.();
    await accepted;
    expect(picker.snapshot()).toMatchObject({ targetId: second.id, selectedIds: [] });
    const later = invoke('listTags', {});

    if (!later.ok) throw new Error('Owned catalog unavailable');
    expect(
      later.value.tags.map(({ name, color, snippetCount }) => ({ name, color, snippetCount }))
    ).toEqual([
      { name: 'later', color: 'red', snippetCount: 1 },
      { name: 'project\0one', color: 'green', snippetCount: 1 },
      { name: 'work', color: 'blue', snippetCount: 1 }
    ]);
    picker.query('');
    expect(picker.matches(later.value.tags)).toEqual([]);
    picker.query('o');
    expect(picker.matches(later.value.tags).map((tag) => tag.id)).toEqual([
      nul.value.tag.id,
      work.id
    ]);
    await picker.toggle(work.id);
    expect(picker.snapshot().open).toBe(true);
    expect(picker.matches(later.value.tags).map((tag) => tag.id)).toEqual([
      work.id,
      nul.value.tag.id
    ]);
    expect(
      invoke('searchSnippets', { ...allSnippets, tagIds: [work.id, nul.value.tag.id] })
    ).toMatchObject({ ok: true, value: { total: 1, items: [{ id: first.id }] } });
    await picker.remove(first.id, work.id);
    const removed = invoke('listTags', {});

    if (!removed.ok) throw new Error('Owned catalog unavailable');
    expect(removed.value.tags.find((tag) => tag.id === work.id)?.snippetCount).toBe(1);
    expect(invoke('ensureTag', { name: '\uD800' })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_REQUEST' }
    });
    picker.query(' '.repeat(3));
    await picker.create();
    expect(picker.snapshot().error).toContain('1–64');
    held = new Promise<void>((resolve) => {
      release = resolve;
    });
    picker.query('not retained after clear');
    const pending = picker.create();

    invoke('clearLibrary', {});
    release?.();
    await pending;
    expect(invoke('listTags', {})).toMatchObject({ ok: true, value: { tags: [] } });
    expect(picker.snapshot().error).toBeDefined();
  } finally {
    picker.close();
    storage.dispose();
  }
});
