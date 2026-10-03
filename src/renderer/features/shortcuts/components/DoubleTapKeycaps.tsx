import type { Modifier } from '../../../../shared/contracts/shortcuts';
import { ShortcutKey } from '../../../components/shared/ShortcutKey';

export function DoubleTapKeycaps({ modifier }: { modifier: Modifier }) {
  const label = { shift: '⇧', control: 'Ctrl', alt: 'Alt', meta: 'Win' }[modifier];

  return (
    <span className="shortcut-tap-keycaps" aria-label={`${modifier} twice`}>
      <ShortcutKey>{label}</ShortcutKey>
      <ShortcutKey>{label}</ShortcutKey>
    </span>
  );
}
