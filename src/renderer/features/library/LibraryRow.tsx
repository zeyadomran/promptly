import type { SnippetPreview } from '../../../shared/contracts/domain';
import { HighlightedText } from '../../components/shared/HighlightedText';
import { Checkbox } from '../../components/ui/checkbox';
import type { HighlightRange } from '../../lib/highlight';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';
import { libraryDisplay } from './library-display';
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
  const workflow = useWorkflowCopy();
  const display = libraryDisplay(state);
  const bundleMode = workflow.bundleState.active;
  const selected = bundleMode
    ? workflow.bundleState.entries.some((entry) => entry.id === snippet.id)
    : display.selectedId === snippet.id;
  const copied = commands?.copiedId === snippet.id;

  const select = () => {
    if (bundleMode) {
      if (state.retained !== undefined) return;
      model.select(snippet.id, index);
      void workflow.bundle.toggle(snippet.id);
      return;
    }

    if (model.select(snippet.id, index) && commands !== undefined) void commands.copy(snippet.id);
  };

  return (
    <div
      id={`snippet-${snippet.id}`}
      role="option"
      aria-selected={selected}
      aria-disabled={state.retained !== undefined}
      aria-description={
        snippet.tags.length === 0
          ? 'Untagged'
          : 'Tags: ' + snippet.tags.map((tag) => tag.name).join(', ')
      }
      aria-posinset={index + 1}
      aria-setsize={display.total}
      data-snippet-id={snippet.id}
      data-compact={!regular || undefined}
      data-active={selected}
      data-bundle={bundleMode || undefined}
      className={`library-row ${positionClass}`}
      onClick={select}
    >
      {bundleMode && (
        <Checkbox
          checked={selected}
          disabled={workflow.bundleState.pending || state.retained !== undefined}
          aria-label={`Select snippet ${String(index + 1)} for bundle`}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onCheckedChange={select}
        />
      )}
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
