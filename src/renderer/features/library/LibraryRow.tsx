import { Check, CornerDownLeft } from 'lucide-react';

import type { Snippet } from '../../../shared/contracts/domain';
import { HighlightedText } from '../../components/shared/HighlightedText';
import type { HighlightRange } from '../../lib/highlight';
import { tagColorClasses } from '../../lib/tag-palette';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';

export function LibraryRow({
  snippet,
  ranges,
  index,
  positionClass
}: {
  snippet: Snippet;
  ranges: readonly HighlightRange[];
  index: number;
  positionClass: string;
}) {
  const { state, model } = useLibrary();
  const commands = useLibraryCommands();
  const selected = state.selectedId === snippet.id;
  const copied = commands?.copiedId === snippet.id;
  const metadata = [snippet.tags.map((tag) => tag.name).join(', '), snippet.sourceApp]
    .filter((part) => part !== null && part !== '')
    .join(' · ');

  return (
    <div
      id={`snippet-${snippet.id}`}
      role="option"
      aria-selected={selected}
      aria-posinset={index + 1}
      aria-setsize={state.total}
      data-snippet-id={snippet.id}
      className={`library-row ${positionClass}`}
      onClick={() => {
        model.select(snippet.id, index);
        if (commands !== undefined) void commands.copy(snippet.id);
      }}
    >
      <div className="library-row-dots" aria-hidden="true">
        {snippet.tags.map((tag) => (
          <span key={tag.id} className={`library-tag-dot ${tagColorClasses[tag.color]}`} />
        ))}
      </div>
      <div className="library-row-content">
        <div className="library-row-text">
          <HighlightedText text={snippet.text} ranges={ranges} />
        </div>
        <div className="library-row-meta">
          <span className="library-row-source">{metadata || 'Untagged'}</span>
          {selected && commands !== undefined && (
            <span className="library-row-action" aria-live="polite">
              {copied ? <Check className="size-3" /> : <CornerDownLeft className="size-3" />}
              {copied ? 'Copied' : 'Copy'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
