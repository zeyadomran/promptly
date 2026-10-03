import type { Snippet } from '../../../shared/contracts/domain';
import { HighlightedText } from '../../components/shared/HighlightedText';
import type { HighlightRange } from '../../lib/highlight';
import { LibraryCopyStatus } from '../library/LibraryCopyStatus';
import { LibraryTagDots } from '../library/LibraryTagDots';
import { relativeTime } from './relative-time';

export function RegularSnippetRow({
  snippet,
  ranges,
  index,
  total,
  selected,
  copied,
  positionClass,
  onSelect
}: {
  snippet: Snippet;
  ranges: readonly HighlightRange[];
  index: number;
  total: number;
  selected: boolean;
  copied: boolean;
  positionClass: string;
  onSelect: () => void;
}) {
  return (
    <div
      id={`snippet-${snippet.id}`}
      role="option"
      aria-selected={selected}
      aria-description={
        snippet.tags.length === 0
          ? 'Untagged'
          : 'Tags: ' + snippet.tags.map((tag) => tag.name).join(', ')
      }
      aria-posinset={index + 1}
      aria-setsize={total}
      data-snippet-id={snippet.id}
      className={`library-row regular-row ${positionClass}`}
      onClick={onSelect}
    >
      <LibraryTagDots tags={snippet.tags} />
      <div className="library-row-content">
        <div className="library-row-text">
          <HighlightedText text={snippet.text} ranges={ranges} />
        </div>
        <time className="regular-row-time" dateTime={snippet.createdAt}>
          {relativeTime(snippet.createdAt)}
        </time>
        <div className="library-row-meta">
          <span className="library-row-source">
            {[snippet.tags.map((tag) => tag.name).join(', '), snippet.sourceApp]
              .filter(Boolean)
              .join(' · ') || 'Untagged'}
          </span>
          {(selected || copied) && <LibraryCopyStatus copied={copied} />}
        </div>
      </div>
    </div>
  );
}
