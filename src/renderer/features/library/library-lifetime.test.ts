import { describe, expect, it } from 'vitest';

import { delayedLibraryFixture } from './delayed-library-fixture';
import { LibraryModel } from './library-model';
import { settleLibrary } from './library-test-fixture';
import { initialQuery } from './page-cache';

describe('library selection lifetime', () => {
  it('retires command eligibility while crossing an unloaded page', async () => {
    const fixture = delayedLibraryFixture();
    const model = new LibraryModel(fixture.bridge);

    model.start();
    await settleLibrary();
    await model.moveSelection(199);
    fixture.holdNext(200);
    const moving = model.moveSelection(1);

    await settleLibrary();
    expect(model.snapshot().selectedId).toBeNull();
    expect(model.snapshot().selectedIndex).toBe(-1);
    const next = model.moveSelection(1);

    fixture.release();
    await Promise.all([moving, next]);
    expect(model.snapshot().selectedId).toBe(fixture.items()[201]?.id);
    expect(model.snapshot().selectedIndex).toBe(201);
    model.close();
  });

  it('retains the desired ID through a second invalidation and rejects the stale scan', async () => {
    const fixture = delayedLibraryFixture();
    const model = new LibraryModel(fixture.bridge);

    model.start();
    await settleLibrary();
    await model.moveSelection(5);
    const selected = fixture.items()[5];

    if (selected === undefined) throw new Error('Missing fixture');
    const first = fixture.items().filter((item) => item.id !== selected.id);

    first.splice(805, 0, selected);
    fixture.holdNext(200);
    fixture.change(first);
    await settleLibrary();
    expect(model.snapshot().selectedId).toBeNull();
    const second = first.filter((item) => item.id !== selected.id);

    second.splice(905, 0, selected);
    fixture.change(second);
    fixture.release();
    await settleLibrary();
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(model.snapshot().selectedIndex).toBe(905);
    expect(model.snapshot().cache.revision).toBe(3);
    model.close();
  });

  it('cancels an old ID scan when the query changes', async () => {
    const fixture = delayedLibraryFixture();
    const model = new LibraryModel(fixture.bridge);

    model.start();
    await settleLibrary();
    await model.moveSelection(5);
    const changed = [...fixture.items()].reverse();

    fixture.holdNext(200);
    fixture.change(changed);
    await settleLibrary();
    model.query({ ...initialQuery, query: 'Snippet 999' });
    fixture.release();
    await settleLibrary();
    expect(model.snapshot().total).toBe(1);
    expect(model.snapshot().selectedId).toBe(changed[0]?.id);
    expect(model.snapshot().selectedIndex).toBe(0);
    model.close();
  });

  it('retires old responses and subscriptions across a StrictMode-style restart', async () => {
    const fixture = delayedLibraryFixture();
    const model = new LibraryModel(fixture.bridge);

    fixture.holdNext(0);
    model.start();
    model.start();
    await settleLibrary();
    expect(fixture.activeSubscriptions()).toBe(1);
    model.close();
    expect(fixture.activeSubscriptions()).toBe(0);
    fixture.change(fixture.items().slice(900));
    model.start();
    await settleLibrary();
    expect(model.snapshot().total).toBe(100);
    fixture.release();
    await settleLibrary();
    expect(model.snapshot().total).toBe(100);
    expect(model.snapshot().cache.revision).toBe(2);
    expect(fixture.activeSubscriptions()).toBe(1);
    model.close();
    expect(fixture.activeSubscriptions()).toBe(0);
  });
});
