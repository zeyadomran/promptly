import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import * as React from 'react';
function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

export { DropdownMenuRadioGroup };
