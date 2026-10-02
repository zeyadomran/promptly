import { type HighlightRange, splitHighlightedText } from '../../lib/highlight';

interface HighlightedTextProps {
  text: string;
  ranges: readonly HighlightRange[];
}

/** React escapes every segment. Snippet content never becomes HTML. */
export function HighlightedText({ text, ranges }: HighlightedTextProps) {
  return splitHighlightedText(text, ranges).map((segment) =>
    segment.highlighted ? (
      <mark key={segment.start} className="rounded-[2px] bg-highlight text-foreground">
        {segment.text}
      </mark>
    ) : (
      segment.text
    )
  );
}
