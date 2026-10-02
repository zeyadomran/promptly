export interface MatchRange {
  start: number;
  end: number;
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

    while (start !== -1 && ranges.length < 512) {
      const originalStart = ascii ? start : starts[start];
      const originalEnd = ascii ? start + term.length : ends[start + term.length - 1];

      if (originalStart !== undefined && originalEnd !== undefined)
        ranges.push({ start: originalStart, end: originalEnd });
      start = folded.indexOf(term, start + 1);
    }
  }

  return ranges.sort((left, right) => left.start - right.start || left.end - right.end);
}
