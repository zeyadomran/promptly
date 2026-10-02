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
export function matchRanges(text: string, terms: readonly string[]): MatchRange[] {
  if (terms.length === 0) return [];
  const ascii = !/[^\p{ASCII}]/u.test(text);
  let folded = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;

  for (const character of ascii ? '' : text) {
    const lower = character.toLowerCase();

    folded += lower;
    for (const _unit of lower.split('')) {
      starts.push(offset);
      ends.push(offset + character.length);
    }

    offset += character.length;
  }

  if (ascii) folded = text.toLowerCase();

  const ranges: MatchRange[] = [];

  for (const term of new Set(terms)) {
    if (term === '') continue;
    let start = folded.indexOf(term);
    let previous: MatchRange | undefined;

    while (start !== -1) {
      const originalStart = ascii ? start : starts[start];
      const originalEnd = ascii ? start + term.length : ends[start + term.length - 1];

      if (originalStart !== undefined && originalEnd !== undefined) {
        // Compress adjacent/overlapping occurrences without dropping any matched text.
        if (previous !== undefined && originalStart <= previous.end)
          previous.end = Math.max(previous.end, originalEnd);
        else {
          previous = { start: originalStart, end: originalEnd };
          ranges.push(previous);
        }
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

  return merged;
}
