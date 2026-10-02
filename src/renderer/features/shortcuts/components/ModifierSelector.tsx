import type { ComponentProps } from 'react';

import { type Modifier, modifierSchema } from '../../../../shared/contracts/shortcuts';
import type { ShortcutPlatform } from '../../../../shared/shortcuts/accelerator';

export function ModifierSelector({
  platform,
  value,
  onChange,
  ...props
}: Omit<ComponentProps<'select'>, 'value' | 'onChange'> & {
  platform: ShortcutPlatform;
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
      <option value="shift">{platform === 'darwin' ? '⇧ Shift' : 'Shift'}</option>
      <option value="control">{platform === 'darwin' ? '⌃ Control' : 'Ctrl'}</option>
      <option value="alt">{platform === 'darwin' ? '⌥ Option' : 'Alt'}</option>
      <option value="meta">{platform === 'darwin' ? '⌘ Command' : 'Win'}</option>
    </select>
  );
}
