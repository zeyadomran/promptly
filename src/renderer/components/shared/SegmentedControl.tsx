import '../../styles/segmented-control.css';

import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';
import { ToggleGroup } from '../ui/toggle-group';

type SegmentedControlProps = Omit<
  Extract<ComponentProps<typeof ToggleGroup>, { type: 'single' }>,
  'type' | 'spacing'
>;

export function SegmentedControl({ className, ...props }: SegmentedControlProps) {
  return (
    <ToggleGroup
      {...props}
      type="single"
      spacing={1}
      className={cn('segmented-control', className)}
    />
  );
}
