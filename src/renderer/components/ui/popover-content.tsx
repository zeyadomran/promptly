import { Popover as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-hidden',
          className
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
