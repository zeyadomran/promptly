import { Check, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import type { TagSummary } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { CommandItem } from '../../components/ui/command-item';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { tagColorStyle } from '../../lib/tag-palette';

function stopNestedActivation(event: KeyboardEvent<HTMLElement>): void {
  // Leave native button/checkbox activation intact; cmdk must not activate another selected row.
  if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
}

export function TagPickerItem({
  tag,
  filter,
  selected,
  disabled,
  toggle
}: {
  tag: TagSummary;
  filter: boolean;
  selected: boolean;
  disabled: boolean;
  toggle: () => void;
}) {
  return (
    <CommandItem value={tag.id} disabled={disabled} onSelect={toggle}>
      {filter && (
        <Checkbox
          checked={selected}
          tabIndex={-1}
          disabled={disabled}
          aria-label={'Filter by ' + tag.name}
          onKeyDown={stopNestedActivation}
          onKeyUp={stopNestedActivation}
          onCheckedChange={toggle}
          onClick={(event) => {
            event.stopPropagation();
          }}
        />
      )}
      <span className="library-tag-dot" style={tagColorStyle(tag.color)} aria-hidden="true" />
      <span className="tag-picker-name">{tag.name}</span>
      {!filter && selected && (
        <>
          <Check aria-hidden="true" size={14} />
          <span className="sr-only">Applied</span>
        </>
      )}
      {filter ? (
        <span className="tag-picker-count" aria-label={String(tag.snippetCount) + ' snippets'}>
          {tag.snippetCount}
        </span>
      ) : selected ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="tag-picker-remove"
              disabled={disabled}
              aria-label={'Remove ' + tag.name}
              onKeyDown={stopNestedActivation}
              onKeyUp={stopNestedActivation}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove {tag.name}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="tag-picker-add">Add</span>
      )}
    </CommandItem>
  );
}
