import { selectionScroll, virtualRange } from './virtual-range';

/** The paged browsing flow owns selection visibility and bounded row geometry. */
export function expectLibraryGeometry(
  selectedIndex: number,
  expect: (actual: unknown) => {
    toBe(expected: unknown): void;
    toMatchObject(expected: object): void;
  }
) {
  expect(selectionScroll(selectedIndex, 100, 0)).toBe(19_706);
  expect(virtualRange(1, 100, 0)).toMatchObject({
    height: 108,
    rows: [{ index: 0, start: 6 }]
  });
  expect(virtualRange(1_400, 100, 137_110)).toMatchObject({
    height: 137_210,
    last: 1_399
  });
  expect(virtualRange(0, 100, 0)).toMatchObject({ height: 0, last: -1, rows: [] });
}
