import { useLibrary } from './library-context';
import { LibrarySort } from './LibrarySort';

export function LibraryListHeader() {
  const { state } = useLibrary();
  const filtered =
    state.request.query.trim() !== '' || state.request.tagIds.length > 0 || state.request.untagged;

  return (
    <div className="library-list-header">
      <span aria-live="polite">
        {filtered
          ? `${String(state.total)} of ${String(state.unfilteredTotal)}`
          : `${String(state.total)} snippets`}
      </span>
      <LibrarySort />
    </div>
  );
}
