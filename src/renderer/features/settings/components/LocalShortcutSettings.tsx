import type { LocalShortcuts } from '../../../../shared/contracts/local-shortcuts';
import { localShortcutLabels } from '../../../../shared/shortcuts/conflicts';
import { ShortcutRecorder } from '../../shortcuts/components/ShortcutRecorder';
import type { useShortcutRecording } from '../../shortcuts/hooks/use-shortcut-recording';
import { SettingsRow } from './SettingsRow';

const descriptions: Record<keyof LocalShortcuts, string> = {
  next: 'Move to the next snippet.',
  previous: 'Move to the previous snippet.',
  copy: 'Copy the selected snippet.',
  delete: 'Delete the selected snippet outside search.',
  deleteAlternate: 'Optional second key for deleting a snippet.',
  focusSearch: 'Focus the library search.',
  tag: 'Open tags for the selected snippet. During text edits, typing and clipboard keys keep their native behavior.',
  settings: 'Open the Settings window.',
  dismiss: 'Clear search first; otherwise hide the window.',
  cancelEdit:
    'Discard the text draft and return to search. Use Esc, a function key, or a Ctrl/Win combination that keeps text editing keys available.'
};

export function LocalShortcutSettings({
  value,
  recording,
  disabled,
  onChange
}: {
  value: LocalShortcuts;
  recording: ReturnType<typeof useShortcutRecording>;
  disabled: boolean;
  onChange: (shortcuts: LocalShortcuts) => Promise<void>;
}) {
  return (
    <>
      <h2 className="shortcut-group-heading">Inside Promptly</h2>
      <p className="shortcut-hint">
        Typing, text selection and control navigation keep their native keys. These bindings run
        only when their command owns keyboard focus. Tab moves focus.
      </p>
      {(Object.keys(localShortcutLabels) as (keyof LocalShortcuts)[]).map((action) => (
        <SettingsRow
          key={action}
          label={localShortcutLabels[action]}
          description={descriptions[action]}
          disabled={disabled}
        >
          <ShortcutRecorder
            label={localShortcutLabels[action]}
            value={value[action]}
            scope="local"
            optional={action === 'deleteAlternate'}
            disabled={disabled}
            recording={recording}
            onChange={(accelerator) =>
              accelerator === null && action !== 'deleteAlternate'
                ? Promise.resolve()
                : onChange({ ...value, [action]: accelerator })
            }
          />
        </SettingsRow>
      ))}
    </>
  );
}
