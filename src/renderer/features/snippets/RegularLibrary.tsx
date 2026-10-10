import { Button } from '../../components/ui/button';
import { useCompose } from '../compose/compose-context';
import { useLibraryCommands } from '../library/library-commands';
import { useLibrary } from '../library/library-context';
import { libraryDisplay } from '../library/library-display';
import { LibraryBundleBar } from '../library/LibraryBundleBar';
import { LibraryEmpty } from '../library/LibraryEmpty';
import { LibraryList } from '../library/LibraryList';
import { LibraryListHeader } from '../library/LibraryListHeader';
import { LibrarySearch } from '../library/LibrarySearch';
import { LibraryTags } from '../library/LibraryTags';
import { RegularFooter } from './RegularFooter';
import { SnippetPreview } from './SnippetPreview';

export function RegularLibrary() {
  const { state, model } = useLibrary();
  const display = libraryDisplay(state);
  const commands = useLibraryCommands();
  const { state: compose } = useCompose();

  return (
    <section className="regular-library" aria-label="Snippet library">
      <header className="regular-library-header">
        <LibrarySearch regular />
        <LibraryTags regular />
      </header>
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
      <div className="regular-library-split" data-composing={compose.draft !== undefined}>
        <div className="regular-library-list">
          <LibraryListHeader />
          <div className="regular-library-results" aria-busy={state.loading}>
            {state.loading && display.total === 0 ? (
              <p role="status" className="library-empty">
                Loading snippets…
              </p>
            ) : display.total === 0 ? (
              <LibraryEmpty />
            ) : (
              <LibraryList regular />
            )}
          </div>
        </div>
        {compose.draft === undefined && <SnippetPreview />}
      </div>
      <LibraryBundleBar />
      <RegularFooter />
    </section>
  );
}
