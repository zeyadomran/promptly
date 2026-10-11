import { Search, X } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useLibrary } from './library-context';

export function LibrarySearch() {
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
      {state.request.query !== '' && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Clear search"
          title="Clear search"
          onClick={() => {
            model.query({ ...state.request, query: '' });
            searchRef.current?.focus();
          }}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
