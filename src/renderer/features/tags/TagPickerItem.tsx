import { X } from 'lucide-react';

import type { TagSummary } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { CommandItem } from '../../components/ui/command-item';
import { tagColorStyle } from '../../lib/tag-palette';

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
          onCheckedChange={toggle}
          onClick={(event) => {
            event.stopPropagation();
          }}
        />
      )}
      <span className="library-tag-dot" style={tagColorStyle(tag.color)} aria-hidden="true" />
      <span className="tag-picker-name">{tag.name}</span>
      {filter ? (
        <span className="tag-picker-count" aria-label={String(tag.snippetCount) + ' snippets'}>
          {tag.snippetCount}
        </span>
      ) : selected ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="tag-picker-remove"
          disabled={disabled}
          aria-label={'Remove ' + tag.name}
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
      ) : (
        <span className="tag-picker-add">Add</span>
      )}
    </CommandItem>
  );
}
