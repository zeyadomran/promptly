import { Checkbox } from 'radix-ui';

export function BundleSelectionCheckbox({
  position,
  disabled,
  label,
  title,
  toggle
}: {
  position: number | undefined;
  disabled: boolean;
  label: string;
  title: string | undefined;
  toggle: () => void;
}) {
  return (
    <Checkbox.Root
      data-slot="checkbox"
      className="bundle-selection-checkbox"
      checked={position !== undefined}
      disabled={disabled}
      aria-label={position === undefined ? label : `${label}, position ${String(position)}`}
      title={title}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onCheckedChange={toggle}
    >
      <Checkbox.Indicator>{position}</Checkbox.Indicator>
    </Checkbox.Root>
  );
}
