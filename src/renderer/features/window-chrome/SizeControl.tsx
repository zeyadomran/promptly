import { RectangleHorizontal, RectangleVertical } from 'lucide-react';

import type { SizeMode } from '../../../shared/contracts/window';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';

export function SizeControl({
  mode,
  onChange
}: {
  mode: SizeMode;
  onChange: (mode: SizeMode) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={mode}
      aria-label="Window size"
      onValueChange={(value) => {
        if (value === 'compact' || value === 'regular') onChange(value);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="compact" aria-label="Compact">
            <RectangleVertical aria-hidden="true" />
            {mode === 'regular' && <span>Compact</span>}
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Compact</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="regular" aria-label="Regular">
            <RectangleHorizontal aria-hidden="true" />
            {mode === 'regular' && <span>Regular</span>}
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Regular</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
