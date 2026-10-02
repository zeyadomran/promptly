import { useLayoutEffect, useRef } from 'react';

import { type HighlightRange, splitHighlightedText } from '../../lib/highlight';
import { registerTextHighlights, supportsNativeHighlights } from '../../lib/native-text-highlights';

interface HighlightedTextProps {
  text: string;
  ranges: readonly HighlightRange[];
}

/** React escapes every segment. Snippet content never becomes HTML. */
export function HighlightedText({ text, ranges }: HighlightedTextProps) {
  const element = useRef<HTMLSpanElement>(null);
  const native = supportsNativeHighlights();

  useLayoutEffect(() => {
    const node = element.current?.firstChild;

    if (native && node instanceof Text) return registerTextHighlights(node, ranges);
    return undefined;
  }, [native, text, ranges]);

  if (native) return <span ref={element}>{text}</span>;
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
