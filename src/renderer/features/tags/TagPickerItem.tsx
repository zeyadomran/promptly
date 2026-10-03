import type { KeyboardEvent } from 'react';

import type { TagSummary } from '../../../shared/contracts/domain';
import { Checkbox } from '../../components/ui/checkbox';
import { CommandItem } from '../../components/ui/command-item';
import { tagColorStyle } from '../../lib/tag-palette';

function stopNestedActivation(event: KeyboardEvent<HTMLElement>): void {
  // Leave native button/checkbox activation intact; cmdk must not activate another selected row.
  if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
}

export function TagPickerItem({
  tag,
  selected,
  disabled,
  toggle
}: {
  tag: TagSummary;
  selected: boolean;
  disabled: boolean;
  toggle: () => void;
}) {
  return (
    <CommandItem value={tag.id} disabled={disabled} onSelect={toggle}>
      <Checkbox
        checked={selected}
        tabIndex={-1}
        disabled={disabled}
        aria-label={'Select tag ' + tag.name}
        onKeyDown={stopNestedActivation}
        onKeyUp={stopNestedActivation}
        onCheckedChange={toggle}
        onClick={(event) => {
          event.stopPropagation();
        }}
      />
      <span className="library-tag-dot" style={tagColorStyle(tag.color)} aria-hidden="true" />
      <span className="tag-picker-name">{tag.name}</span>
      <span className="tag-picker-count" aria-label={String(tag.snippetCount) + ' snippets'}>
        {tag.snippetCount}
      </span>
    </CommandItem>
  );
}
