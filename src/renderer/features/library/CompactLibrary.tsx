import { Button } from '../../components/ui/button';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';
import { libraryDisplay } from './library-display';
import { LibraryBundleBar } from './LibraryBundleBar';
import { LibraryEmpty } from './LibraryEmpty';
import { LibraryFilterRow } from './LibraryFilterRow';
import { LibraryFooter } from './LibraryFooter';
import { LibraryList } from './LibraryList';

export function CompactLibrary() {
  const { state, model } = useLibrary();
  const display = libraryDisplay(state);
  const commands = useLibraryCommands();

  return (
    <section className="compact-library" aria-label="Snippet library">
      <LibraryFilterRow />
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
      <LibraryBundleBar />
      <LibraryFooter />
    </section>
  );
}
