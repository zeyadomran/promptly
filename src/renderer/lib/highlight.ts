import { foldText, matchRanges } from '../../shared/search/match-text';

export interface HighlightRange {
  start: number;
  end: number;
}

export interface TextSegment extends HighlightRange {
  text: string;
  highlighted: boolean;
}

/** Literal, Unicode-aware matching; offsets are UTF-16, as in JS string.slice. */
export function findTextMatches(text: string, query: string): HighlightRange[] {
  if (query.length === 0) return [];

  return matchRanges(text, [foldText(query)]);
}

/** Invalid offsets are ignored and intersecting ranges are merged before rendering. */
export function splitHighlightedText(
  text: string,
  ranges: readonly HighlightRange[]
): TextSegment[] {
  const valid = ranges
    .filter(
      ({ start, end }) =>
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        start >= 0 &&
        end <= text.length &&
        end > start
    )
    .map((range) => ({ ...range }))
    .sort((left, right) => left.start - right.start);
  const merged: HighlightRange[] = [];

  for (const range of valid) {
    const previous = merged.at(-1);

    if (previous !== undefined && range.start <= previous.end)
      previous.end = Math.max(previous.end, range.end);
    else merged.push(range);
  }

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const range of merged) {
    if (range.start > cursor)
      segments.push({
        start: cursor,
        end: range.start,
        text: text.slice(cursor, range.start),
        highlighted: false
      });
    segments.push({ ...range, text: text.slice(range.start, range.end), highlighted: true });
    cursor = range.end;
  }

  if (cursor < text.length)
    segments.push({
      start: cursor,
      end: text.length,
      text: text.slice(cursor),
      highlighted: false
    });

  return segments;
}
