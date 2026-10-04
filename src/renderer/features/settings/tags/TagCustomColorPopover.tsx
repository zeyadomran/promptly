import { Popover } from 'radix-ui';
import { useState } from 'react';

import { PopoverContent } from '../../../components/ui/popover-content';
import { type TagColor, tagColorHex, tagColorStyle } from '../../../lib/tag-palette';
import { TagCustomColorEditor } from './TagCustomColorEditor';

export function TagCustomColorPopover({
  color,
  disabled,
  change
}: {
  color: TagColor;
  disabled: boolean;
  change: (color: TagColor) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="tag-management-hex-chip"
          disabled={disabled}
          aria-label="Choose custom tag color"
        >
          <span className="library-tag-dot" style={tagColorStyle(color)} aria-hidden="true" />
          <span>{tagColorHex(color)}</span>
        </button>
      </Popover.Trigger>
      <PopoverContent
        className="tag-custom-color-popover"
        side="left"
        align="start"
        sideOffset={8}
        collisionPadding={8}
        aria-label="Custom tag color"
        data-promptly-overlay="tag-color"
      >
        <TagCustomColorEditor
          color={color}
          change={(chosen) => {
            change(chosen);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover.Root>
  );
}
