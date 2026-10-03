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

  const pending = [...new Set(terms)]
    .filter((term) => term !== '')
    .map((term) => ({ term, start: folded.indexOf(term) }))
    .filter((item) => item.start >= 0);
  const ranges: MatchRange[] = [];

  // Merge in text order, retaining only term cursors and the capped range union.
  for (;;) {
    let next: (typeof pending)[number] | undefined;

    for (const item of pending) if (next === undefined || item.start < next.start) next = item;
    if (next === undefined) break;
    const previous = ranges.at(-1);
    const end = next.start + next.term.length;

    if (previous !== undefined && next.start <= previous.end)
      previous.end = Math.max(previous.end, end);
    else {
      if (ranges.length === limit) break;
      ranges.push({ start: next.start, end });
    }

    next.start = folded.indexOf(next.term, next.start + 1);
    if (next.start === -1) pending.splice(pending.indexOf(next), 1);
  }

  return ascii ? ranges : originalRanges(text, ranges);
}
