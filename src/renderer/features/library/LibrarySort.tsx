import { ArrowDownWideNarrow } from 'lucide-react';

import type { SearchRequest } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { useLibrary } from './library-context';

const sorts: { value: SearchRequest['sort']; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most-copied', label: 'Most copied' },
  { value: 'recently-copied', label: 'Recently copied' }
];

export function LibrarySort() {
  const { state, model } = useLibrary();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Sort snippets">
              <ArrowDownWideNarrow aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Sort snippets
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={state.request.sort}
          onValueChange={(value) => {
            const sort = sorts.find((item) => item.value === value);

            if (sort !== undefined) model.query({ ...state.request, sort: sort.value });
          }}
        >
          {sorts.map((sort) => (
            <DropdownMenuRadioItem key={sort.value} value={sort.value}>
              {sort.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void window.promptly.quitApplication({}).then((result) => {
              if (!result.ok) model.reportError(result.error);
            });
          }}
        >
          Quit Promptly
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
