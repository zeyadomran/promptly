import type { Snippet } from '../../../shared/contracts/domain';
import { HighlightedText } from '../../components/shared/HighlightedText';
import type { HighlightRange } from '../../lib/highlight';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';
import { LibraryMetadata } from './LibraryMetadata';
import { LibraryTagDots } from './LibraryTagDots';

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
        const accepted = model.select(snippet.id, index);

        if (accepted && commands !== undefined) void commands.copy(snippet.id);
      }}
    >
      <LibraryTagDots tags={snippet.tags} />
      <div className="library-row-content">
        <div className="library-row-text">
          <HighlightedText text={snippet.text} ranges={ranges} />
        </div>
        <LibraryMetadata
          snippet={snippet}
          copied={copied}
          actionable={commands !== undefined && (selected || copied)}
        />
      </div>
    </div>
  );
}
