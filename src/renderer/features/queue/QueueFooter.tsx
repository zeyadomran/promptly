import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { usePreferences } from '../settings/settings-context';
import { useQueue } from './queue-context';

export function QueueFooter() {
  const { settings } = usePreferences();
  const { state } = useQueue();
  const keys = settings.localShortcuts;
  const label = (binding: string) => shortcutLabel(binding, window.promptly.platform);

  return (
    <footer className="queue-footer">
      <span>
        <kbd>{label(keys.copy)}</kbd> Copy
      </span>
      {keys.copyAndReturn !== null && (
        <span>
          <kbd>{label(keys.copyAndReturn)}</kbd> Return
        </span>
      )}
      {keys.queueComplete !== null && (
        <span>
          <kbd>{label(keys.queueComplete)}</kbd> {state.tab === 'open' ? 'Done' : 'Reopen'}
        </span>
      )}
      {state.tab === 'open' && keys.moveUp !== null && keys.moveDown !== null && (
        <span className="queue-move-hint">
          <kbd>{label(keys.moveUp)}</kbd> / <kbd>{label(keys.moveDown)}</kbd> Move
        </span>
      )}
    </footer>
  );
}
