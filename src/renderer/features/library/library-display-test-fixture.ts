import type { delayedLibraryFixture } from './delayed-library-fixture';
import { libraryDisplay } from './library-display';
import type { LibraryModel } from './library-model';
import { initialQuery } from './page-cache';

type Fixture = ReturnType<typeof delayedLibraryFixture>;
type Expect = (actual: unknown) => {
  toEqual(expected: unknown): void;
  toBeNull(): void;
  toBe(expected: unknown): void;
  toMatchObject(expected: object): void;
};
type Settle = (read: () => unknown, expected: unknown) => Promise<unknown>;

export async function expectRetainedLibraryRefresh(
  fixture: Fixture,
  model: LibraryModel,
  expect: Expect,
  settle: Settle
): Promise<void> {
  const displayed = model.snapshot().cache.at(0);

  if (displayed === undefined) throw new Error('Missing displayed owned row');
  fixture.holdNext(0);
  model.refresh();
  expect(libraryDisplay(model.snapshot()).cache.at(0)).toEqual(displayed);
  expect(model.snapshot().selectedId).toBeNull();
  expect(model.select(displayed.snippet.id, 0)).toBe(false);
  await settle(() => fixture.requests.at(-1)?.limit, 200);
  fixture.release();
  await settle(() => model.snapshot().selectedIndex, 0);
}

export async function expectLibraryReadFailure(
  fixture: Fixture,
  model: LibraryModel,
  expect: Expect,
  settle: Settle
): Promise<void> {
  const search = fixture.bridge.searchSnippets;

  fixture.bridge.searchSnippets = () =>
    Promise.resolve({ ok: false, error: { code: 'UNAVAILABLE', message: 'Owned read failure' } });
  model.query({ ...initialQuery, query: 'failure' });
  await settle(() => model.snapshot().loading, false);
  expect(model.snapshot()).toMatchObject({
    loading: false,
    total: 0,
    selectedId: null,
    retained: undefined,
    error: { message: 'Owned read failure' }
  });
  expect(libraryDisplay(model.snapshot()).cache.size).toBe(0);
  fixture.bridge.searchSnippets = search;
}

export function expectLibraryCopyRefresh(
  fixture: Fixture,
  model: LibraryModel,
  id: string,
  expect: Expect
): void {
  fixture.copy(id);
  expect(model.snapshot()).toMatchObject({ selectedId: id, selectedIndex: 905, loading: false });
  expect(model.snapshot().cache.at(905)?.snippet).toMatchObject({
    copyCount: 1,
    lastCopiedAt: '2026-10-03T00:00:00Z'
  });
  expect(model.snapshot().cache.revision).toBe(4);
}
