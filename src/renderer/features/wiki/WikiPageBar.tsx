import { Check, ChevronDown, ChevronLeft, ChevronRight, List } from 'lucide-react';

import type { WikiPageId } from '../../../shared/contracts/wiki';
import { Button } from '../../components/ui/button';
import { DropdownMenuContent } from '../../components/ui/dropdown-menu-content';
import { DropdownMenuItem } from '../../components/ui/dropdown-menu-item';
import { DropdownMenu } from '../../components/ui/dropdown-menu-root';
import { DropdownMenuTrigger } from '../../components/ui/dropdown-menu-trigger';
import { type WikiPage, wikiPages } from './wiki-pages';

export function WikiPageBar({
  page,
  index,
  onSelect
}: {
  page: WikiPage;
  index: number;
  onSelect: (page: WikiPageId) => void;
}) {
  const previous = wikiPages[index - 1];
  const next = wikiPages[index + 1];

  return (
    <nav className="wiki-page-bar" aria-label="Wiki page navigation">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="wiki-page-trigger"
            aria-label={`Choose wiki page, current page ${page.title}`}
          >
            <List aria-hidden="true" />
            <span>{page.title}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {wikiPages.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => {
                onSelect(item.id);
              }}
              aria-current={item.id === page.id ? 'page' : undefined}
            >
              {item.title}
              {item.id === page.id ? <Check aria-hidden="true" className="ml-auto" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="wiki-page-count">
        {index + 1} of {wikiPages.length}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={previous === undefined ? 'Previous wiki page' : `Previous: ${previous.title}`}
        disabled={previous === undefined}
        onClick={() => {
          if (previous !== undefined) onSelect(previous.id);
        }}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={next === undefined ? 'Next wiki page' : `Next: ${next.title}`}
        disabled={next === undefined}
        onClick={() => {
          if (next !== undefined) onSelect(next.id);
        }}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
