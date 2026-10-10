import type { LibraryModel } from './library-model';

export async function libraryRevealFlow(
  model: LibraryModel,
  id: string,
  priorReveal: number,
  expect: (actual: unknown) => {
    toBe(expected: unknown): void;
    toBeGreaterThan(expected: number): void;
  },
  settle: (read: () => unknown, expected: unknown) => Promise<void>
) {
  await model.reveal(id);
  await settle(() => model.snapshot().selectedId, id);
  expect(model.snapshot().request.sort).toBe('most-copied');
  expect(model.snapshot().revealVersion).toBeGreaterThan(priorReveal);
}
