import { shortcutKeycaps, type ShortcutPlatform } from '../../../../shared/shortcuts/accelerator';
import { ShortcutKey } from '../../../components/shared/ShortcutKey';

export function ShortcutKeycaps({
  accelerator,
  platform
}: {
  accelerator: string;
  platform: ShortcutPlatform;
}) {
  const keys = shortcutKeycaps(accelerator, platform);

  return (
    <span className="shortcut-keycaps">
      {keys.map((key, index) => (
        <ShortcutKey key={`${String(index)}-${key}`}>{key}</ShortcutKey>
      ))}
    </span>
  );
}
