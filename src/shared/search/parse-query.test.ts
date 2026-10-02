import { describe, expect, it } from 'vitest';

import { foldText, matchRanges } from './match-text';
import { parseQuery } from './parse-query';

describe('literal search language', () => {
  it('combines quoted filters, free text AND terms, and unknown literal filters', () => {
    expect(
      parseQuery('tag:"code review" FROM:"Windows Terminal" flaky "test case" kind:note')
    ).toEqual({
      tags: ['code review'],
      sources: ['Windows Terminal'],
      text: ['flaky', 'test case', 'kind:note']
    });
  });
  it('uses accumulated incomplete quotes, ignores empty tokens, preserves punctuation and paths', () => {
    expect(parseQuery('tag: from: "" % _ (a)* C:\\work tag:"unfinished name')).toEqual({
      text: ['%', '_', '(a)*', 'C:\\work'],
      tags: ['unfinished name'],
      sources: []
    });
  });
  it('escapes quotes, backslashes, spaces and filter colons; terminal backslash is literal', () => {
    expect(parseQuery('tag\\:literal a\\ b "say \\"yes\\"" \\\\ \\')).toEqual({
      text: ['tag:literal', 'a b', 'say "yes"', '\\', '\\'],
      tags: [],
      sources: []
    });
  });
  it('maps Unicode expansions, supplementary characters and embedded NUL to original offsets', () => {
    const text = '👋İΣ\u0000END 𐐀';

    expect(foldText(text)).toBe('👋i\u0307σ\u0000end 𐐨');
    expect(matchRanges(text, ['i', 'σ', '\u0000end', '𐐨'])).toEqual([
      { start: 2, end: 8 },
      { start: 9, end: 11 }
    ]);
    expect(foldText('é')).not.toBe(foldText('e\u0301'));
    expect(foldText('ß')).not.toBe(foldText('SS'));
  });
  it('preserves every term and occurrence beyond 512 while merging redundant spans', () => {
    expect(matchRanges(`b ${'a'.repeat(512)}`, ['a', 'b'])).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 514 }
    ]);
    const text = `b ${'a '.repeat(700)}İ b`;
    const ranges = matchRanges(text, ['a', 'i', 'b']);

    expect(ranges).toHaveLength(703);
    expect(ranges[0]).toEqual({ start: 0, end: 1 });
    expect(ranges.at(-2)).toEqual({ start: text.length - 3, end: text.length - 2 });
    expect(ranges.at(-1)).toEqual({ start: text.length - 1, end: text.length });
  });
});
