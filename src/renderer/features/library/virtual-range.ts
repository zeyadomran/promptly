export const ROW_HEIGHT = 78;
export const ROW_GAP = 8;
export const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;
const OVERSCAN = 4;

export interface VirtualRange {
  height: number;
  first: number;
  last: number;
  rows: readonly { index: number; start: number }[];
}

/** Fixed row geometry bounds DOM work independently of the library size. */
export function virtualRange(
  count: number,
  viewportHeight: number,
  scrollTop: number,
  rowHeight = ROW_HEIGHT,
  rowStride = ROW_STRIDE
): VirtualRange {
  const height =
    Math.max(0, count * rowStride - (rowStride - rowHeight)) + (count > 0 ? ROW_GAP : 0);
  const top = Math.max(0, Math.min(scrollTop, height - viewportHeight));
  const first = Math.max(0, Math.floor(top / rowStride) - OVERSCAN);
  const last =
    viewportHeight <= 0
      ? -1
      : Math.min(count - 1, Math.floor((top + viewportHeight - 1) / rowStride) + OVERSCAN);

  return {
    height,
    first,
    last,
    rows: Array.from({ length: Math.max(0, last - first + 1) }, (_, offset) => {
      const index = first + offset;

      return { index, start: index * rowStride };
    })
  };
}

export function selectionScroll(
  index: number,
  viewportHeight: number,
  scrollTop: number,
  rowHeight = ROW_HEIGHT,
  rowStride = ROW_STRIDE
): number {
  const start = index * rowStride;
  const end = start + rowHeight + ROW_GAP;

  if (start < scrollTop) return start;
  if (end > scrollTop + viewportHeight) return Math.max(0, end - viewportHeight);
  return scrollTop;
}
