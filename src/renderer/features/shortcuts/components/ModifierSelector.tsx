import type { ComponentProps } from 'react';

import { type Modifier, modifierSchema } from '../../../../shared/contracts/shortcuts';

export function ModifierSelector({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<'select'>, 'value' | 'onChange'> & {
  value: Modifier;
  onChange: (modifier: Modifier) => void;
}) {
  return (
    <select
      {...props}
      className="shortcut-modifier"
      value={value}
      onChange={(event) => {
        const modifier = modifierSchema.safeParse(event.target.value);

        if (modifier.success) onChange(modifier.data);
      }}
    >
      <option value="shift">Shift</option>
      <option value="control">Ctrl</option>
      <option value="alt">Alt</option>
      <option value="meta">Win</option>
    </select>
  );
}
