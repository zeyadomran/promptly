import { expect, it } from 'vitest';

import { delayedLibraryFixture } from './delayed-library-fixture';
import { LibraryModel } from './library-model';
import { settleLibrary } from './library-test-fixture';
import { initialQuery } from './page-cache';

it('browses paged results with command-safe selection across refreshes and newer queries', async () => {
  const fixture = delayedLibraryFixture(1_400);
  const model = new LibraryModel(fixture.bridge);

  try {
    model.start();
    await settleLibrary();
    await model.moveSelection(199);
    fixture.holdNext(200);
    const moving = model.moveSelection(1);

    await settleLibrary();
    expect(model.snapshot().selectedId).toBeNull();
    const next = model.moveSelection(1);

    fixture.release();
    await Promise.all([moving, next]);
    const selected = fixture.items()[201];

    if (selected === undefined) throw new Error('Missing owned item');
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(model.snapshot().selectedIndex).toBe(201);
    for (const index of [400, 600, 800, 1_000, 1_200, 0]) {
      model.ensure(index);
      await settleLibrary();
    }

    expect(model.snapshot().cache.size).toBeLessThanOrEqual(5);
    expect(model.snapshot().cache.at(201)).toBeUndefined();
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(model.snapshot().selectedIndex).toBe(201);
    expect(model.select(selected.id, 201)).toBe(false);
    model.refresh();
    expect(model.snapshot().selectedId).toBeNull();
    await settleLibrary();
    expect(model.snapshot().selectedId).toBe(selected.id);
    const changed = fixture.items().filter((item) => item.id !== selected.id);

    changed.splice(805, 0, selected);
    fixture.holdNext(200);
    fixture.change(changed);
    await settleLibrary();
    expect(model.snapshot().selectedId).toBeNull();
    const latest = changed.filter((item) => item.id !== selected.id);

    latest.splice(905, 0, selected);
    fixture.change(latest);
    fixture.release();
    await settleLibrary();
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(model.snapshot().selectedIndex).toBe(905);
    fixture.holdNext(200);
    fixture.change(latest);
    await settleLibrary();
    model.query({ ...initialQuery, query: 'Snippet 999' });
    fixture.release();
    await settleLibrary();
    expect(model.snapshot().selectedId).toBe('00000000-0000-4000-8000-000000000999');
    expect(model.snapshot().total).toBe(1);
    expect(model.snapshot().unfilteredTotal).toBe(1_400);
    model.query({ ...initialQuery, query: 'missing' });
    await settleLibrary();
    expect(model.snapshot().selectedId).toBeNull();
    expect(model.snapshot().total).toBe(0);
    model.query(initialQuery);
    await settleLibrary();
    expect(model.snapshot().total).toBe(1_400);
    fixture.change([], ['snippets', 'tags']);
    await settleLibrary();
    expect(model.snapshot().selectedId).toBeNull();
    expect(model.snapshot().unfilteredTotal).toBe(0);
  } finally {
    model.close();
  }
});
