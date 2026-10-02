import { describe, expect, it } from 'vitest';

import { findTextMatches, splitHighlightedText } from './highlight';

describe('literal highlight matching', () => {
  it('escapes regular expression syntax and ignores empty queries', () => {
    expect(findTextMatches('a.* [test] a.*', 'a.*')).toEqual([
      { start: 0, end: 3 },
      { start: 11, end: 14 }
    ]);
    expect(findTextMatches('[test]', '[')).toEqual([{ start: 0, end: 1 }]);
    expect(findTextMatches('text', '')).toEqual([]);
  });
  it('uses actual matched Unicode lengths and does not lowercase offsets', () => {
    const text = 'İ 😀 TEST test';
    const ranges = findTextMatches(text, 'test');

    expect(ranges.map(({ start, end }) => text.slice(start, end))).toEqual(['TEST', 'test']);
    expect(findTextMatches('😀😀', '😀')).toEqual([{ start: 0, end: 4 }]);
  });
  it('merges intersecting ranges without mutating callers and rejects invalid offsets', () => {
    const ranges = [
      { start: 4, end: 8 },
      { start: 1, end: 5 },
      { start: -1, end: 4 },
      { start: 3.5, end: 6 },
      { start: 0, end: 99 },
      { start: 2, end: 2 }
    ];
    const original = structuredClone(ranges);
    const segments = splitHighlightedText('0123456789', ranges);

    expect(segments.map(({ text, highlighted }) => ({ text, highlighted }))).toEqual([
      { text: '0', highlighted: false },
      { text: '1234567', highlighted: true },
      { text: '89', highlighted: false }
    ]);
    expect(segments.map((segment) => segment.text).join('')).toBe('0123456789');
    expect(ranges).toEqual(original);
  });
});
