import { describe, expect, it } from 'vitest';

import { LibraryModel } from './library-model';
import { libraryFixture, settleLibrary } from './library-test-fixture';
import { initialQuery, MAX_CACHED_PAGES } from './page-cache';

describe('paged library selection', () => {
  it('crosses the actual 200-row IPC boundary and keeps a bounded cache at 10k', async () => {
    const fixture = libraryFixture(10_000);
    const model = new LibraryModel(fixture.bridge);

    model.start();
    await settleLibrary();
    await model.moveSelection(199);
    await model.moveSelection(1);
    expect(model.snapshot().selectedId).toBe(fixture.items()[200]?.id);
    expect(fixture.requests.some((request) => request.offset === 200)).toBe(true);
    for (let offset = 400; offset < 2_000; offset += 200) {
      model.ensure(offset);
      await settleLibrary();
    }

    expect(model.snapshot().cache.size).toBeLessThanOrEqual(MAX_CACHED_PAGES);
    expect(model.snapshot().total).toBe(10_000);
    expect(model.snapshot().unfilteredTotal).toBe(10_000);
    model.close();
  });

  it('keeps a validated offscreen selection when user scrolling evicts its page', async () => {
    const fixture = libraryFixture(10_000);
    const model = new LibraryModel(fixture.bridge);
    const selections: (string | null)[] = [];

    model.start();
    await settleLibrary();
    const selected = model.snapshot().selectedId;
    const before = fixture.requests.length;
    const unsubscribe = model.subscribe(() => {
      selections.push(model.snapshot().selectedId);
    });

    for (let offset = 200; offset <= 1_600; offset += 200) {
      model.ensure(offset);
      await settleLibrary();
    }

    expect(fixture.requests.slice(before).map((request) => request.offset)).toEqual([
      200, 400, 600, 800, 1_000, 1_200, 1_400, 1_600
    ]);
    expect(selections.every((id) => id === selected)).toBe(true);
    expect(model.snapshot().selectedIndex).toBe(0);
    expect(model.snapshot().cache.size).toBe(5);
    expect(model.snapshot().cache.at(0)).toBeUndefined();
    unsubscribe();
    model.close();
  });

  it('finds the selected ID beyond loaded pages after an import/reorder', async () => {
    const fixture = libraryFixture();
    const model = new LibraryModel(fixture.bridge);

    model.start();
    await settleLibrary();
    await model.moveSelection(5);
    const selected = fixture.items()[5];

    if (selected === undefined) throw new Error('Missing fixture');
    const changed = fixture.items().filter((item) => item.id !== selected.id);

    changed.splice(805, 0, selected);
    fixture.change(changed, ['snippets', 'tags']);
    await settleLibrary();
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(model.snapshot().selectedIndex).toBe(805);
    expect(model.snapshot().cache.size).toBeLessThanOrEqual(MAX_CACHED_PAGES);
    model.close();
  });

  it('reconciles deletion and clear without confusing a missing page with absence', async () => {
    const fixture = libraryFixture(501);
    const model = new LibraryModel(fixture.bridge);

    model.start();
    await settleLibrary();
    await model.moveSelection(200);
    fixture.change(fixture.items().filter((_, index) => index !== 200));
    await settleLibrary();
    expect(model.snapshot().selectedId).toBe(fixture.items()[200]?.id);
    expect(model.snapshot().selectedIndex).toBe(200);
    fixture.change([], ['snippets', 'tags']);
    await settleLibrary();
    expect(model.snapshot().selectedId).toBeNull();
    expect(model.snapshot().total).toBe(0);
    expect(model.snapshot().unfilteredTotal).toBe(0);
    model.close();
  });

  it('keeps filtered and unfiltered totals separate and resets no-results', async () => {
    const fixture = libraryFixture();
    const model = new LibraryModel(fixture.bridge);

    model.start();
    await settleLibrary();
    model.query({ ...initialQuery, query: 'Snippet 999' });
    await settleLibrary();
    expect(model.snapshot().total).toBe(1);
    expect(model.snapshot().unfilteredTotal).toBe(1_000);
    model.query({ ...initialQuery, query: 'missing' });
    await settleLibrary();
    expect(model.snapshot().selectedId).toBeNull();
    model.query(initialQuery);
    await settleLibrary();
    expect(model.snapshot().total).toBe(1_000);
    expect(model.snapshot().selectedIndex).toBe(0);
    model.close();
  });

  it('does not reload pages for contiguous settings-only pin/geometry commits', async () => {
    const fixture = libraryFixture();
    const model = new LibraryModel(fixture.bridge);

    model.start();
    await settleLibrary();
    const before = fixture.requests.length;

    fixture.change(fixture.items(), ['settings']);
    await settleLibrary();
    expect(fixture.requests.length).toBe(before);
    model.ensure(200);
    await settleLibrary();
    expect(model.snapshot().cache.size).toBe(2);
    expect(model.snapshot().selectedId).toBe(fixture.items()[0]?.id);
    model.close();
  });
});
