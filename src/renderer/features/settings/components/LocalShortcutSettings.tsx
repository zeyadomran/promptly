import type { LocalShortcuts } from '../../../../shared/contracts/local-shortcuts';
import { localShortcutLabels } from '../../../../shared/shortcuts/conflicts';
import { ShortcutBindingControl } from '../../shortcuts/components/ShortcutBindingControl';
import { ShortcutGroup } from '../../shortcuts/components/ShortcutGroup';
import { ShortcutRow } from '../../shortcuts/components/ShortcutRow';
import type { useShortcutPreferences } from '../../shortcuts/hooks/use-shortcut-preferences';
import type { useShortcutRecording } from '../../shortcuts/hooks/use-shortcut-recording';
import { ResetShortcutsButton } from './ResetShortcutsButton';

const descriptions: Record<keyof LocalShortcuts, string> = {
  next: 'Move to the next snippet.',
  previous: 'Move to the previous snippet.',
  copy: 'Copy the selected snippet.',
  newSnippet: 'Start a draft in Library or Queue.',
  showLibrary: 'Show the Library workspace.',
  showQueue: 'Show the Queue workspace.',
  copyAndReturn: 'Copy selected text and return to the previous app. Paste it yourself.',
  queueComplete: 'Complete or reopen the selected queued prompt.',
  moveUp: 'Move a queued prompt or bundle item up.',
  moveDown: 'Move a queued prompt or bundle item down.',
  bundle: 'Select Library snippets for a transient context bundle.',
  delete: 'Delete the selected snippet outside search. Either binding runs the same command.',
  deleteAlternate: 'Optional second key for deleting a snippet.',
  focusSearch: 'Focus the library search.',
  tag: 'Open tags for the selected snippet. During text edits, typing and clipboard keys keep their native behavior.',
  settings: 'Open Settings.',
  dismiss: 'Clear search first; otherwise hide the window.',
  cancelEdit:
    'Discard the text draft and return to search. Use Esc, a function key, or a Ctrl/Win combination that keeps text editing keys available.'
};

export function LocalShortcutSettings({
  preferences,
  recording,
  disabled
}: {
  preferences: ReturnType<typeof useShortcutPreferences>;
  recording: ReturnType<typeof useShortcutRecording>;
  disabled: boolean;
}) {
  return (
    <ShortcutGroup
      title="Inside Promptly"
      description="When the window is focused"
      status={
        <ResetShortcutsButton
          localOnly
          disabled={disabled || recording.snapshot.phase !== 'idle'}
          apply={preferences.apply}
        />
      }
    >
      {(Object.keys(localShortcutLabels) as (keyof LocalShortcuts)[])
        .filter((action) => action !== 'deleteAlternate')
        .map((action) => (
          <ShortcutRow
            key={action}
            label={localShortcutLabels[action]}
            description={descriptions[action]}
            dense
          >
            <ShortcutBindingControl
              target={action}
              label={localShortcutLabels[action]}
              scope="local"
              preferences={preferences}
              recording={recording}
              disabled={disabled}
            />
            {action === 'delete' && (
              <>
                <span className="shortcut-alternative">or</span>
                <ShortcutBindingControl
                  target="deleteAlternate"
                  label={localShortcutLabels.deleteAlternate}
                  scope="local"
                  optional
                  preferences={preferences}
                  recording={recording}
                  disabled={disabled}
                />
              </>
            )}
          </ShortcutRow>
        ))}
    </ShortcutGroup>
  );
}
