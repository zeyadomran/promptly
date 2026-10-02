import { Command as Primitive } from 'cmdk';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

export function CommandItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="command-item"
      className={cn('tag-command-item', className)}
      {...props}
    />
  );
}
