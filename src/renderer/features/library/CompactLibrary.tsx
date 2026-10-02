import { Button } from '../../components/ui/button';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';
import { LibraryEmpty } from './LibraryEmpty';
import { LibraryFooter } from './LibraryFooter';
import { LibraryList } from './LibraryList';
import { LibrarySearch } from './LibrarySearch';
import { LibraryTags } from './LibraryTags';

export function CompactLibrary() {
  const { state, model, selection } = useLibrary();
  const commands = useLibraryCommands();

  return (
    <section
      className="compact-library"
      aria-label="Snippet library"
      onKeyDown={(event) => {
        if (commands !== undefined || event.nativeEvent.isComposing) return;
        if (event.defaultPrevented || !(event.target instanceof HTMLElement)) return;
        if (!event.target.matches('[data-promptly-search], [role="listbox"]')) return;
        if (
          (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          void selection.moveSelection(event.key === 'ArrowDown' ? 1 : -1);
        }
      }}
    >
      <LibrarySearch />
      <LibraryTags />
      {(state.error?.message ?? commands?.error) !== undefined && (
        <p role="alert" className="library-error">
          {state.error?.message ?? commands?.error}
          {state.error !== undefined && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                model.query(state.request);
              }}
            >
              Retry
            </Button>
          )}
        </p>
      )}
      <div className="library-results" aria-busy={state.loading}>
        {state.loading && state.total === 0 ? (
          <p className="library-empty" role="status">
            Loading snippets…
          </p>
        ) : state.total === 0 ? (
          <LibraryEmpty />
        ) : (
          <LibraryList />
        )}
      </div>
      <LibraryFooter />
    </section>
  );
}
