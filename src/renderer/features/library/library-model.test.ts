import { expect, it, vi } from 'vitest';

import { SnippetSession } from '../snippets/snippet-session';
import { delayedLibraryFixture } from './delayed-library-fixture';
import { LibraryModel } from './library-model';
import { initialQuery } from './page-cache';

it('browses paged results with command-safe selection across refreshes and newer queries', async () => {
  const fixture = delayedLibraryFixture(1_400);
  const model = new LibraryModel(fixture.bridge);
  const preview = new SnippetSession({
    getSnippet: ({ id }) => {
      const snippet = fixture.items().find((item) => item.id === id);

      return Promise.resolve(
        snippet === undefined
          ? { ok: false, error: { code: 'NOT_FOUND', message: 'Snippet no longer exists.' } }
          : { ok: true, value: { revision: 1, snippet } }
      );
    },
    updateSnippet: () => Promise.reject(new Error('Unused external operation'))
  });
  const unsubscribe = model.subscribe(() => {
    const { selectedId, loading, total } = model.snapshot();

    preview.select(selectedId, loading || total > 0);
  });

  try {
    preview.start();
    model.start();
    await vi.waitFor(() => {
      expect(model.snapshot().selectedIndex).toBe(0);
    });
    await model.moveSelection(-1);
    expect(model.snapshot().selectedIndex).toBe(0);
    expect(model.snapshot().revealVersion).toBe(1);
    await model.moveSelection(199);
    fixture.holdNext(200);
    const moving = model.moveSelection(1);

    await vi.waitFor(() => {
      expect(model.snapshot().selectedId).toBeNull();
    });
    const next = model.moveSelection(1);

    fixture.release();
    await Promise.all([moving, next]);
    const selected = fixture.items()[201];

    if (selected === undefined) throw new Error('Missing owned item');
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(model.snapshot().selectedIndex).toBe(201);
    await vi.waitFor(() => {
      expect(preview.snapshot().snippet).toMatchObject({ id: selected.id, text: 'Snippet 201' });
    });
    const reveal = model.snapshot().revealVersion;

    for (const index of [400, 600, 800, 1_000, 1_200, 0]) {
      model.ensure(index);
      await vi.waitFor(() => {
        expect(model.snapshot().cache.at(index)).toBeDefined();
      });
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
    await vi.waitFor(() => {
      expect(model.snapshot().selectedId).toBe(selected.id);
    });
    const changed = fixture.items().filter((item) => item.id !== selected.id);

    changed.splice(805, 0, selected);
    fixture.holdNext(200);
    fixture.change(changed);
    await vi.waitFor(() => {
      expect(model.snapshot().cache.revision).toBe(2);
    });
    expect(model.snapshot().selectedId).toBeNull();
    const latest = changed.filter((item) => item.id !== selected.id);

    latest.splice(905, 0, selected);
    fixture.change(latest);
    fixture.release();
    await vi.waitFor(() => {
      expect(model.snapshot().selectedIndex).toBe(905);
    });
    expect(model.snapshot().selectedId).toBe(selected.id);
    expect(preview.snapshot().snippet?.text).toBe('Snippet 201');
    fixture.holdNext(200);
    fixture.change(latest);
    await vi.waitFor(() => {
      expect(model.snapshot().cache.revision).toBe(4);
    });
    const deliberate = latest[5];

    if (deliberate === undefined) throw new Error('Missing deliberate owned selection');
    expect(model.select(deliberate.id, 5)).toBe(true);
    fixture.release();
    await vi.waitFor(() => {
      expect(preview.snapshot().snippet?.id).toBe(deliberate.id);
    });
    expect(model.snapshot().selectedId).toBe(deliberate.id);
    fixture.holdNext(400);
    const oldQueryPage = model.moveSelection(400);

    await vi.waitFor(() => {
      expect(model.snapshot().selectedId).toBeNull();
    });
    model.query({ ...initialQuery, query: 'Snippet 999' });
    fixture.release();
    await oldQueryPage;
    await vi.waitFor(() => {
      expect(model.snapshot().total).toBe(1);
    });
    expect(model.snapshot().selectedId).toBe('00000000-0000-4000-8000-000000000999');
    expect(model.snapshot().unfilteredTotal).toBe(1_400);
    model.query({ ...initialQuery, query: 'missing' });
    await vi.waitFor(() => {
      expect(model.snapshot()).toMatchObject({ loading: false, total: 0 });
    });
    expect(model.snapshot().selectedId).toBeNull();
    model.query(initialQuery);
    await vi.waitFor(() => {
      expect(model.snapshot().total).toBe(1_400);
    });
    fixture.change([], ['snippets', 'tags']);
    await vi.waitFor(() => {
      expect(model.snapshot().unfilteredTotal).toBe(0);
    });
    expect(model.snapshot().selectedId).toBeNull();
    expect(model.snapshot().total).toBe(0);
  } finally {
    unsubscribe();
    preview.close();
    model.close();
  }
});
