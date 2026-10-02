import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import type { toggleVariants } from '@/components/ui/toggle';

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
  }
>({
  size: 'default',
  variant: 'default',
  spacing: 0
});

export { ToggleGroupContext };
