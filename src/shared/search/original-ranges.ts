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

  const translated: MatchRange[] = [];

  for (const range of ranges) {
    const original = { start: offset(range.start, false), end: offset(range.end - 1, true) };
    const previous = translated.at(-1);

    // Separate folded positions can touch in the same original lowercase expansion.
    if (previous !== undefined && original.start <= previous.end)
      previous.end = Math.max(previous.end, original.end);
    else translated.push(original);
  }

  return translated;
}
