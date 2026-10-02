import { describe, expect, it } from 'vitest';

import { ROW_HEIGHT, selectionScroll, virtualRange } from './virtual-range';

describe('fixed library range', () => {
  it('bounds mounted rows at 10k while preserving exact full scroll geometry', () => {
    for (const top of [0, 79, 80, 16_000, 720_000, 900_000]) {
      const range = virtualRange(10_000, 488, top);

      expect(range.rows.length).toBeLessThanOrEqual(16);
      expect(range.height).toBe(799_998);
      expect(range.rows[0]?.index).toBe(range.first);
      expect(range.rows.at(-1)?.index).toBe(range.last);
      expect(range.rows.every((row) => row.start === row.index * 80)).toBe(true);
      expect(range.last).toBeLessThan(10_000);
    }
  });

  it('keeps keyboard targets fully visible without moving an already visible row', () => {
    expect(selectionScroll(0, 488, 0)).toBe(0);
    expect(selectionScroll(6, 488, 0)).toBe(70);
    expect(selectionScroll(200, 488, 70)).toBe(15_590);
    expect(selectionScroll(199, 488, 15_590)).toBe(15_590);
    expect(selectionScroll(1, 488, 15_590)).toBe(80);
    const range = virtualRange(10_000, 268, selectionScroll(9_999, 268, 0));

    expect(range.rows.some((row) => row.index === 9_999)).toBe(true);
    expect(range.rows.at(-1)?.start).toBe(range.height - ROW_HEIGHT);
  });

  it('publishes no phantom rows before measurement or after Clear all', () => {
    expect(virtualRange(10_000, 0, 0).rows).toEqual([]);
    expect(virtualRange(0, 488, 799_998)).toEqual({ height: 0, first: 0, last: -1, rows: [] });
    expect(virtualRange(1, 488, 799_998).rows).toEqual([{ index: 0, start: 0 }]);
  });
});
