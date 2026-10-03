import { CheckIcon } from 'lucide-react';
import { Checkbox as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

export function Checkbox({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded border border-input bg-background text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className
      )}
      {...props}
    >
      <Primitive.Indicator className="grid place-content-center text-current">
        <CheckIcon className="size-3.5" />
      </Primitive.Indicator>
    </Primitive.Root>
  );
}
