import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import * as React from 'react';
function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

export { DropdownMenuTrigger };
