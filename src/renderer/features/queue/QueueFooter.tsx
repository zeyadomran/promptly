import { usePreferences } from '../settings/settings-context';
import { useQueue } from './queue-context';

export function QueueFooter() {
  const { settings } = usePreferences();
  const { state } = useQueue();
  const keys = settings.localShortcuts;

  return (
    <footer className="queue-footer">
      <span>
        <kbd>{keys.copy}</kbd> Copy
      </span>
      {keys.copyAndReturn !== null && (
        <span>
          <kbd>{keys.copyAndReturn}</kbd> Return
        </span>
      )}
      {keys.queueComplete !== null && (
        <span>
          <kbd>{keys.queueComplete}</kbd> {state.tab === 'open' ? 'Done' : 'Reopen'}
        </span>
      )}
      {state.tab === 'open' && keys.moveUp !== null && keys.moveDown !== null && (
        <span className="queue-move-hint">
          <kbd>{keys.moveUp}</kbd> / <kbd>{keys.moveDown}</kbd> Move
        </span>
      )}
    </footer>
  );
}
