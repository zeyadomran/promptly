import { useState } from 'react';

import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { useShellNavigation } from '../window-chrome/shell-navigation';
import { useLibrary } from './library-context';
import { librarySortOptions } from './library-sort-options';
import { LibrarySortItem } from './LibrarySortItem';

export function LibrarySort() {
  const { state, model } = useLibrary();
  const { view } = useShellNavigation();
  const [open, setOpen] = useState(false);
  const current = librarySortOptions.find((sort) => sort.value === state.request.sort);

  if (current === undefined) return null;
  const Icon = current.icon;

  return (
    <DropdownMenu open={view === 'library' && open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="library-sort-trigger"
          aria-label={'Sort snippets: ' + current.label}
          title={'Sort snippets: ' + current.label}
        >
          <Icon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      {view === 'library' && (
        <DropdownMenuContent
          align="end"
          className="library-sort-menu"
          onCloseAutoFocus={(event) => {
            if (document.querySelector('[data-shell-library][hidden]') !== null)
              event.preventDefault();
          }}
        >
          <div className="library-sort-heading">Sort by</div>
          <DropdownMenuRadioGroup
            value={state.request.sort}
            onValueChange={(value) => {
              const sort = librarySortOptions.find((item) => item.value === value);

              if (sort !== undefined) model.query({ ...state.request, sort: sort.value });
            }}
          >
            {librarySortOptions.map((sort) => (
              <LibrarySortItem key={sort.value} {...sort} />
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
