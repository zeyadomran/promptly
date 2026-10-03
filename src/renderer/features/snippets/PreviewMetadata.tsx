import { useLayoutEffect, useRef, useState } from 'react';

import type { Snippet } from '../../../shared/contracts/domain';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { relativeTime } from './relative-time';

export function PreviewMetadata({ snippet }: { snippet: Snippet }) {
  const source = snippet.sourceApp ?? 'No source application';
  const label = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = label.current;

    if (element === null) return;
    let active = true;
    const measure = () => {
      if (active) setTruncated(element.scrollWidth > element.clientWidth);
    };

    const observer = new ResizeObserver(measure);

    observer.observe(element);
    void document.fonts.ready.then(measure);
    measure();
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [source]);

  return (
    <span className="snippet-preview-meta">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            ref={label}
            className="snippet-preview-source"
            tabIndex={truncated ? 0 : undefined}
            aria-label={'Source: ' + source}
          >
            {source}
          </span>
        </TooltipTrigger>
        {truncated && (
          <TooltipContent className="snippet-preview-source-tooltip">{source}</TooltipContent>
        )}
      </Tooltip>
      <time dateTime={snippet.createdAt}>{relativeTime(snippet.createdAt)}</time>
    </span>
  );
}
