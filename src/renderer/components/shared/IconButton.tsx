import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface IconButtonProps extends Omit<
  ComponentProps<typeof Button>,
  'children' | 'asChild' | 'size'
> {
  label: string;
  shortcut?: string | undefined;
  icon: LucideIcon;
}

export function IconButton({ label, shortcut, icon: Icon, ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          data-promptly-icon-button
          aria-label={label}
          {...props}
        >
          <Icon aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut !== undefined && <kbd className="ml-2 font-mono opacity-60">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}
