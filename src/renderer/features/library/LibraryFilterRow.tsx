import '../bundles/bundle-selection.css';

import { useLibrary } from './library-context';
import { libraryDisplay } from './library-display';
import { LibraryBundleButton } from './LibraryBundleButton';
import { LibrarySort } from './LibrarySort';
import { LibraryTags } from './LibraryTags';

export function LibraryFilterRow() {
  const { state } = useLibrary();
  const display = libraryDisplay(state);
  const filtered =
    display.request.query.trim() !== '' ||
    display.request.tagIds.length > 0 ||
    display.request.untagged;
  const count = filtered
    ? `${String(display.total)} of ${String(state.unfilteredTotal)}`
    : String(display.total);

  return (
    <div className="library-filter-row">
      <LibraryTags />
      <span className="library-result-count" role="status" aria-label={`${count} snippets`}>
        {count}
      </span>
      <LibrarySort />
      <LibraryBundleButton />
    </div>
  );
}
