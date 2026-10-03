import { expect, it, vi } from 'vitest';

import { delayedLibraryFixture } from './delayed-library-fixture';
import { LibraryModel } from './library-model';
import { libraryPreviewFixture } from './library-preview-test-fixture';
import { initialQuery } from './page-cache';
import { selectionScroll } from './virtual-range';

it('browses paged results with command-safe selection across refreshes and newer queries', async () => {
  const fixture = delayedLibraryFixture(1_400);
  const model = new LibraryModel(fixture.bridge);
  const { preview, unsubscribe } = libraryPreviewFixture(fixture, model);
  const settle = (read: () => unknown, expected: unknown) =>
    vi.waitFor(() => {
      expect(read()).toEqual(expected);
    });

  try {
    preview.start();
    model.start();
    await settle(() => model.snapshot().selectedIndex, 0);
    await model.moveSelection(-1);
    expect(model.snapshot().selectedIndex).toBe(0);
    expect(model.snapshot().revealVersion).toBe(1);
    await model.moveSelection(199);
    fixture.holdNext(200);
    const moving = model.moveSelection(1);

    await settle(() => model.snapshot().selectedId, null);
    const next = model.moveSelection(1);

    fixture.release();
    await Promise.all([moving, next]);
    const selected = fixture.items()[201];

    if (selected === undefined) throw new Error('Missing owned item');
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(model.snapshot().selectedIndex).toBe(201);
    expect(selectionScroll(model.snapshot().selectedIndex, 100, 0)).toBe(17_272);
    await vi.waitFor(() => {
      expect(preview.snapshot().snippet).toMatchObject({ id: selected.id, text: 'Snippet 201' });
    });
    const reveal = model.snapshot().revealVersion;

    for (const index of [400, 600, 800, 1_000, 1_200, 0]) {
      model.ensure(index);
      await settle(() => model.snapshot().cache.at(index) !== undefined, true);
    }

    expect(model.snapshot().cache.size).toBeLessThanOrEqual(5);
    expect(model.snapshot().cache.at(201)).toBeUndefined();
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(model.snapshot().selectedIndex).toBe(201);
    expect(model.snapshot().revealVersion).toBe(reveal);
    expect(model.select(selected.id, 201)).toBe(false);
    model.refresh();
    expect(model.snapshot().selectedId).toBeNull();
    expect(preview.snapshot().snippet?.id).toBe(selected.id);
    await settle(() => model.snapshot().selectedId, selected.id);
    const changed = fixture.items().filter((item) => item.id !== selected.id);

    changed.splice(805, 0, selected);
    fixture.holdNext(200);
    fixture.change(changed);
    await settle(() => model.snapshot().cache.revision, 2);
    expect(model.snapshot().selectedId).toBeNull();
    const latest = changed.filter((item) => item.id !== selected.id);

    latest.splice(905, 0, selected);
    fixture.change(latest);
    fixture.release();
    await settle(() => model.snapshot().selectedIndex, 905);
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(preview.snapshot().snippet?.text).toBe('Snippet 201');
    fixture.copy(selected.id);
    expect(model.snapshot()).toMatchObject({
      selectedId: selected.id,
      selectedIndex: 905,
      loading: false
    });
    expect(model.snapshot().cache.at(905)?.snippet).toMatchObject({
      copyCount: 1,
      lastCopiedAt: '2026-10-03T00:00:00Z'
    });
    expect(model.snapshot().cache.revision).toBe(4);
    const copied = latest[1_000];

    if (copied === undefined) throw new Error('Missing owned copy target');
    fixture.holdNext(1_000);
    model.ensure(1_000);
    await settle(() => fixture.requests.at(-1)?.offset, 1_000);
    fixture.copy(copied.id);
    fixture.release();
    await settle(() => model.snapshot().cache.at(1_000)?.snippet.copyCount, 1);
    expect(model.snapshot()).toMatchObject({
      selectedId: selected.id,
      selectedIndex: 905,
      loading: false
    });
    fixture.holdNext(200);
    fixture.change(latest);
    await settle(() => model.snapshot().cache.revision, 6);
    const deliberate = latest[5];

    if (deliberate === undefined) throw new Error('Missing deliberate owned selection');
    expect(model.select(deliberate.id, 5)).toBe(true);
    fixture.release();
    await settle(() => preview.snapshot().snippet?.id, deliberate.id);
    expect(model.snapshot().selectedId).toBe(deliberate.id);
    fixture.holdNext(400);
    const oldQueryPage = model.moveSelection(400);

    await settle(() => model.snapshot().selectedId, null);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const requested = fixture.requests.length;

    model.query({ ...initialQuery, query: 'Snippet 9' }, true);
    expect(model.snapshot().request.query).toBe('Snippet 9');
    expect(model.snapshot().selectedId).toBeNull();
    fixture.release();
    await oldQueryPage;
    await vi.advanceTimersByTimeAsync(199);
    expect(model.snapshot()).toMatchObject({ loading: true, total: 0, selectedId: null });
    expect(model.snapshot().cache.size).toBe(0);
    expect(fixture.requests.slice(requested)).toEqual([]);
    model.query({ ...initialQuery, query: 'Snippet 999' }, true);
    model.ensure(0);
    await vi.advanceTimersByTimeAsync(199);
    expect(model.snapshot()).toMatchObject({ loading: true, total: 0, selectedId: null });
    expect(fixture.requests.slice(requested)).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(fixture.requests.slice(requested)).toEqual([{ ...initialQuery, query: 'Snippet 999' }]);
    expect(model.snapshot().total).toBe(1);
    expect(model.snapshot().selectedId).toBe('00000000-0000-4000-8000-000000000999');
    expect(model.snapshot().unfilteredTotal).toBe(1_400);
    fixture.holdNext(0);
    model.refresh();
    await vi.advanceTimersByTimeAsync(0);
    model.query({ ...initialQuery, query: 'Snippet 999' }, true);
    fixture.release();
    await vi.advanceTimersByTimeAsync(199);
    expect(model.snapshot()).toMatchObject({ loading: true, total: 0, selectedId: null });
    expect(model.snapshot().cache.size).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(model.snapshot().total).toBe(1);
    model.query({ ...initialQuery, query: 'missing' }, true);
    model.query({ ...model.snapshot().request, sort: 'oldest', untagged: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(model.snapshot()).toMatchObject({ loading: false, total: 0, selectedId: null });
    const missingRequest = { ...initialQuery, query: 'missing', sort: 'oldest', untagged: true };

    expect(fixture.requests.at(-1)).toEqual(missingRequest);
    const applied = fixture.requests.length;

    await vi.advanceTimersByTimeAsync(200);
    expect(fixture.requests.slice(applied)).toEqual([]);
    model.query({ ...initialQuery, query: 'Snippet 9' }, true);
    model.query(initialQuery, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(model.snapshot().total).toBe(1_400);
    expect(fixture.requests.at(-1)).toEqual(initialQuery);
    const cleared = fixture.requests.length;

    await vi.advanceTimersByTimeAsync(200);
    expect(fixture.requests.slice(cleared)).toEqual([]);
    model.query({ ...initialQuery, query: 'Snippet 999' }, true);
    model.close();
    const closed = fixture.requests.length;

    await vi.advanceTimersByTimeAsync(200);
    expect(fixture.requests.slice(closed)).toEqual([]);
    model.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(model.snapshot().selectedId).toBe('00000000-0000-4000-8000-000000000999');
    model.query(initialQuery);
    await vi.advanceTimersByTimeAsync(0);
    vi.useRealTimers();
    model.query({ ...initialQuery, sort: 'most-copied' });
    await settle(() => model.snapshot().selectedId, '00000000-0000-4000-8000-000000000000');
    fixture.copy(deliberate.id);
    expect(model.snapshot().selectedId).toBeNull();
    await vi.waitFor(() => {
      expect(model.snapshot().cache.at(0)?.snippet.id).toBe(deliberate.id);
      expect(model.snapshot().selectedId).toBe('00000000-0000-4000-8000-000000000000');
      expect(model.snapshot().selectedIndex).toBe(1);
    });
    fixture.change([], ['snippets', 'tags']);
    await settle(() => model.snapshot().unfilteredTotal, 0);
    expect(model.snapshot().selectedId).toBeNull();
    expect(model.snapshot().total).toBe(0);
  } finally {
    unsubscribe();
    preview.close();
    model.close();
    vi.useRealTimers();
  }
});
