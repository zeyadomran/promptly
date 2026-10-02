import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

interface ShortcutKeyProps extends ComponentProps<'kbd'> {
  label?: string;
}

export function ShortcutKey({ children, className, label, ...props }: ShortcutKeyProps) {
  return (
    <kbd
      className={cn(
        'rounded-sm border border-b-2 bg-sidebar px-1.5 py-0.5 font-mono text-xs font-medium',
        className
      )}
      aria-label={label}
      {...props}
    >
      {children}
    </kbd>
  );
}
