import type { Snippet } from '../../../shared/contracts/domain';
import { HighlightedText } from '../../components/shared/HighlightedText';
import type { HighlightRange } from '../../lib/highlight';
import { RegularSnippetRow } from '../snippets/RegularSnippetRow';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';
import { LibraryMetadata } from './LibraryMetadata';
import { LibraryTagDots } from './LibraryTagDots';

export function LibraryRow({
  snippet,
  ranges,
  index,
  positionClass,
  regular = false
}: {
  snippet: Snippet;
  ranges: readonly HighlightRange[];
  index: number;
  positionClass: string;
  regular?: boolean;
}) {
  const { state, model } = useLibrary();
  const commands = useLibraryCommands();
  const selected = state.selectedId === snippet.id;
  const copied = commands?.copiedId === snippet.id;

  const select = () => {
    if (model.select(snippet.id, index) && commands !== undefined) void commands.copy(snippet.id);
  };

  if (regular)
    return (
      <RegularSnippetRow
        snippet={snippet}
        ranges={ranges}
        index={index}
        total={state.total}
        selected={selected}
        copied={copied}
        positionClass={positionClass}
        onSelect={select}
      />
    );

  return (
    <div
      id={`snippet-${snippet.id}`}
      role="option"
      aria-selected={selected}
      aria-posinset={index + 1}
      aria-setsize={state.total}
      data-snippet-id={snippet.id}
      className={`library-row ${positionClass}`}
      onClick={select}
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
