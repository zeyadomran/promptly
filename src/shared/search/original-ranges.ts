import type { MatchRange } from './match-text';

/** Translate sorted folded ranges with a forward-only cursor, without per-unit offset arrays. */
export function originalRanges(text: string, ranges: readonly MatchRange[]): MatchRange[] {
  const iterator = text[Symbol.iterator]();
  let character = iterator.next().value;
  let foldedOffset = 0;
  let originalOffset = 0;

  function offset(index: number, end: boolean): number {
    while (character !== undefined && index >= foldedOffset + character.toLowerCase().length) {
      foldedOffset += character.toLowerCase().length;
      originalOffset += character.length;
      character = iterator.next().value;
    }

    return originalOffset + (end ? (character?.length ?? 0) : 0);
  }

  return ranges.map((range) => ({
    start: offset(range.start, false),
    end: offset(range.end - 1, true)
  }));
}
