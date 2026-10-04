import { useLibrary } from './library-context';
import { libraryDisplay } from './library-display';
import { LibrarySort } from './LibrarySort';

export function LibraryListHeader() {
  const { state } = useLibrary();
  const display = libraryDisplay(state);
  const filtered =
    display.request.query.trim() !== '' ||
    display.request.tagIds.length > 0 ||
    display.request.untagged;

  return (
    <div className="library-list-header">
      <span aria-live="polite">
        {filtered
          ? `${String(display.total)} of ${String(state.unfilteredTotal)}`
          : `${String(display.total)} snippets`}
      </span>
      <LibrarySort />
    </div>
  );
}
