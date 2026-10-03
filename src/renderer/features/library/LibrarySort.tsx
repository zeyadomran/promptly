import { ChevronDown } from 'lucide-react';

import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { useLibrary } from './library-context';
import { librarySortOptions } from './library-sort-options';
import { LibrarySortItem } from './LibrarySortItem';

export function LibrarySort() {
  const { state, model } = useLibrary();
  const current = librarySortOptions.find((sort) => sort.value === state.request.sort);

  if (current === undefined) return null;
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="library-sort-trigger"
          aria-label={'Sort snippets: ' + current.label}
        >
          <Icon aria-hidden="true" />
          {current.label}
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="library-sort-menu">
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
    </DropdownMenu>
  );
}
