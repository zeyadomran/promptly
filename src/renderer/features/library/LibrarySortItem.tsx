import { Check, type LucideIcon } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

export function LibrarySortItem({
  value,
  label,
  icon: Icon
}: {
  value: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <DropdownMenuPrimitive.RadioItem value={value} className="library-sort-item">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <DropdownMenuPrimitive.ItemIndicator className="library-sort-check">
        <Check aria-hidden="true" />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  );
}
