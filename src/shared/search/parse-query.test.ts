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
      { start: 2, end: 3 },
      { start: 3, end: 4 },
      { start: 4, end: 8 },
      { start: 9, end: 11 }
    ]);
    expect(foldText('é')).not.toBe(foldText('e\u0301'));
    expect(foldText('ß')).not.toBe(foldText('SS'));
  });
});
