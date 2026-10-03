import { originalRanges } from './original-ranges';

export interface MatchRange {
  start: number;
  end: number;
}

export function isScalarBoundary(text: string, offset: number): boolean {
  const previous = text.charCodeAt(offset - 1);
  const current = text.charCodeAt(offset);

  return !(previous >= 0xd800 && previous <= 0xdbff && current >= 0xdc00 && current <= 0xdfff);
}

/** Locale-independent, per-code-point Unicode lowercase; no accent normalization. */
export function foldText(text: string): string {
  if (!/[^\p{ASCII}]/u.test(text)) return text.toLowerCase();
  let folded = '';

  for (const character of text) folded += character.toLowerCase();
  return folded;
}

/** Translate folded matches (including expansions) back to original UTF-16 offsets. */
export function matchRanges(
  text: string,
  terms: readonly string[],
  limit = Infinity
): MatchRange[] {
  if (terms.length === 0) return [];
  const ascii = !/[^\p{ASCII}]/u.test(text);
  const folded = foldText(text);

  const ranges: MatchRange[] = [];

  for (const term of new Set(terms)) {
    if (term === '') continue;
    let start = folded.indexOf(term);
    let previous: MatchRange | undefined;
    let count = 0;

    while (start !== -1) {
      // Bound intermediate occurrences per term, then union the earliest visible ranges.
      if (previous !== undefined && start <= previous.end)
        previous.end = Math.max(previous.end, start + term.length);
      else {
        if (count === limit) break;
        previous = { start, end: start + term.length };
        ranges.push(previous);
        count += 1;
      }

      start = folded.indexOf(term, start + 1);
    }
  }

  const merged: MatchRange[] = [];

  for (const range of ranges.sort(
    (left, right) => left.start - right.start || left.end - right.end
  )) {
    const previous = merged.at(-1);

    if (previous !== undefined && range.start <= previous.end)
      previous.end = Math.max(previous.end, range.end);
    else merged.push(range);
  }

  const bounded = merged.slice(0, limit);

  return ascii ? bounded : originalRanges(text, bounded);
}
