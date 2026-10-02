import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../../../lib/utils';

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}
