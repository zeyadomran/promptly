import { type Modifier, modifierSchema } from '../../../../shared/contracts/shortcuts';
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group';

export function ModifierSelector({
  id,
  value,
  disabled,
  onChange
}: {
  id?: string;
  value: Modifier;
  disabled: boolean;
  onChange: (modifier: Modifier) => void;
}) {
  return (
    <ToggleGroup
      id={id}
      type="single"
      value={value}
      disabled={disabled}
      className="shortcut-modifier"
      aria-label="Double-tap modifier"
      onValueChange={(next) => {
        const modifier = modifierSchema.safeParse(next);

        if (modifier.success) onChange(modifier.data);
      }}
    >
      <ToggleGroupItem value="shift">Shift</ToggleGroupItem>
      <ToggleGroupItem value="control">Ctrl</ToggleGroupItem>
      <ToggleGroupItem value="alt">Alt</ToggleGroupItem>
      {value === 'meta' && <ToggleGroupItem value="meta">Win</ToggleGroupItem>}
    </ToggleGroup>
  );
}
