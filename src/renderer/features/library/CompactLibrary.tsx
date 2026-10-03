import { Button } from '../../components/ui/button';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';
import { libraryDisplay } from './library-display';
import { LibraryEmpty } from './LibraryEmpty';
import { LibraryFooter } from './LibraryFooter';
import { LibraryList } from './LibraryList';
import { LibraryListHeader } from './LibraryListHeader';
import { LibrarySearch } from './LibrarySearch';
import { LibraryTags } from './LibraryTags';

export function CompactLibrary() {
  const { state, model } = useLibrary();
  const display = libraryDisplay(state);
  const commands = useLibraryCommands();

  return (
    <section className="compact-library" aria-label="Snippet library">
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
                model.refresh();
              }}
            >
              Refresh library
            </Button>
          )}
        </p>
      )}
      <LibraryListHeader />
      <div className="library-results" aria-busy={state.loading}>
        {state.loading && display.total === 0 ? (
          <p className="library-empty" role="status">
            Loading snippets…
          </p>
        ) : display.total === 0 ? (
          <LibraryEmpty />
        ) : (
          <LibraryList />
        )}
      </div>
      <LibraryFooter />
    </section>
  );
}
