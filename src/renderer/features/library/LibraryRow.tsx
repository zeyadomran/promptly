import type { SnippetPreview } from '../../../shared/contracts/domain';
import { HighlightedText } from '../../components/shared/HighlightedText';
import type { HighlightRange } from '../../lib/highlight';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';
import { LibraryMetadata } from './LibraryMetadata';
import { LibraryTagRail } from './LibraryTagRail';

export function LibraryRow({
  snippet,
  ranges,
  index,
  regular,
  positionClass
}: {
  snippet: SnippetPreview;
  ranges: readonly HighlightRange[];
  index: number;
  regular: boolean;
  positionClass: string;
}) {
  const { state, model } = useLibrary();
  const commands = useLibraryCommands();
  const selected = state.selectedId === snippet.id;
  const copied = commands?.copiedId === snippet.id;

  const select = () => {
    if (model.select(snippet.id, index) && commands !== undefined) void commands.copy(snippet.id);
  };

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
      aria-setsize={state.total}
      data-snippet-id={snippet.id}
      data-compact={!regular || undefined}
      data-active={selected}
      className={`library-row ${positionClass}`}
      onClick={select}
    >
      <LibraryTagRail tags={snippet.tags} />
      <div className="library-row-content">
        <div className="library-row-text">
          <HighlightedText text={snippet.text} ranges={ranges} />
        </div>
        <LibraryMetadata snippet={snippet} copied={copied} regular={regular} />
      </div>
    </div>
  );
}
