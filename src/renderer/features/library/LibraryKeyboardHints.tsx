import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { usePreferences } from '../settings/settings-context';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';

export function LibraryKeyboardHints({ regular = false }: { regular?: boolean }) {
  const { settings } = usePreferences();
  const workflow = useWorkflowCopy();
  const label = (binding: string) =>
    shortcutLabel(binding, window.promptly.platform)
      .replace('DELETE', 'Del')
      .replace('BACKSPACE', 'Backspace')
      .replace('TAB', 'Tab');

  return (
    <div className="library-keyboard-hints">
      {regular && (
        <span>
          <kbd>
            {label(settings.localShortcuts.previous)} {label(settings.localShortcuts.next)}
          </kbd>{' '}
          navigate
        </span>
      )}
      <span>
        <kbd>{label(settings.localShortcuts.copy)}</kbd>{' '}
        {workflow.bundleState.active ? 'select' : 'copy'}
      </span>
      {!workflow.bundleState.active && (
        <span>
          <kbd>{label(settings.localShortcuts.tag)}</kbd> tag
        </span>
      )}
      {workflow.bundleState.active && (
        <span>
          <kbd>{label(settings.localShortcuts.dismiss)}</kbd> cancel
        </span>
      )}
      {workflow.bundleState.active && settings.localShortcuts.copyAndReturn !== null && (
        <span>
          <kbd>{label(settings.localShortcuts.copyAndReturn)}</kbd> review
        </span>
      )}
      {regular && !workflow.bundleState.active && (
        <span>
          <kbd>{label(settings.localShortcuts.delete)}</kbd> remove
        </span>
      )}
    </div>
  );
}
