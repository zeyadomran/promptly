import { Command as Primitive } from 'cmdk';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

export function CommandInput({ className, ...props }: ComponentProps<typeof Primitive.Input>) {
  return (
    <div className="tag-command-search">
      <Search aria-hidden="true" size={14} />
      <Primitive.Input
        data-slot="command-input"
        className={cn('tag-command-input', className)}
        {...props}
      />
    </div>
  );
}
