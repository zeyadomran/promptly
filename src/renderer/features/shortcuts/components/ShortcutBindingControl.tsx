import { shortcutBinding, type ShortcutTarget } from '../../../../shared/shortcuts/shortcut-edit';
import type { useShortcutPreferences } from '../hooks/use-shortcut-preferences';
import type { useShortcutRecording } from '../hooks/use-shortcut-recording';
import { ShortcutRecorder } from './ShortcutRecorder';

export function ShortcutBindingControl({
  target,
  label,
  preferences,
  recording,
  disabled,
  scope = 'global',
  optional = false
}: {
  target: ShortcutTarget;
  label: string;
  preferences: ReturnType<typeof useShortcutPreferences>;
  recording: ReturnType<typeof useShortcutRecording>;
  disabled: boolean;
  scope?: 'global' | 'local';
  optional?: boolean;
}) {
  return (
    <ShortcutRecorder
      id={'shortcut-' + target}
      label={label}
      value={shortcutBinding(preferences.settings, target)}
      scope={scope}
      optional={optional}
      disabled={disabled}
      recording={recording}
      inspect={(binding) => preferences.inspect(target, binding)}
      onChange={(binding) => preferences.bind(target, binding)}
      onSwap={(binding, collision) => preferences.swap(target, binding, collision.action)}
    />
  );
}
