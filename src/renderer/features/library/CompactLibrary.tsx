import { PinStatus } from '../../components/shared/PinStatus';
import { Button } from '../../components/ui/button';
import { usePreferences } from '../settings/settings-context';
import { useLibraryCommands } from './library-commands';
import { useLibrary } from './library-context';
import { LibraryEmpty } from './LibraryEmpty';
import { LibraryList } from './LibraryList';
import { LibrarySearch } from './LibrarySearch';
import { LibraryTags } from './LibraryTags';

export function CompactLibrary() {
  const { state, model, selection } = useLibrary();
  const { settings } = usePreferences();
  const commands = useLibraryCommands();

  return (
    <section
      className="compact-library"
      aria-label="Snippet library"
      onKeyDown={(event) => {
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
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              model.query(state.request);
            }}
          >
            Retry
          </Button>
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
      <footer className="library-footer">
        <span aria-live="polite">
          {state.total} of {state.unfilteredTotal}
        </span>
        <PinStatus pinned={settings.alwaysOnTop} />
      </footer>
    </section>
  );
}
