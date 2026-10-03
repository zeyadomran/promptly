import { Search } from 'lucide-react';

import { Input } from '../../components/ui/input';
import { useLibrary } from './library-context';

export function LibrarySearch({ regular = false }: { regular?: boolean }) {
  const { state, model, searchRef } = useLibrary();

  return (
    <div className="library-search">
      <Search aria-hidden="true" className="size-4 text-muted-foreground" />
      <Input
        ref={searchRef}
        autoFocus
        data-promptly-search
        aria-label="Search snippets"
        placeholder="Search"
        value={state.request.query}
        maxLength={4096}
        className="library-search-input"
        onChange={(event) => {
          model.query({ ...state.request, query: event.target.value }, true);
        }}
      />
      {regular ? (
        <span className="regular-filter-hint">tag:review from:terminal</span>
      ) : (
        <kbd className="library-key-hint">esc</kbd>
      )}
    </div>
  );
}
