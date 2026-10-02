import { Command as Primitive } from 'cmdk';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

export function Command({ className, ...props }: ComponentProps<typeof Primitive>) {
  return <Primitive data-slot="command" className={cn('tag-command', className)} {...props} />;
}

export const CommandList = Primitive.List;
export const CommandGroup = Primitive.Group;
export const CommandEmpty = Primitive.Empty;
