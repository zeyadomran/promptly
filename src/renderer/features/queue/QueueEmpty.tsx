import { ListTodoIcon } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { usePreferences } from '../settings/settings-context';
import { useShortcutStatus } from '../shortcuts/hooks/use-shortcut-status';
import { useShellNavigation } from '../window-chrome/shell-navigation';
import { useQueue } from './queue-context';

export function QueueEmpty() {
  const { state, model } = useQueue();
  const navigation = useShellNavigation();
  const preferences = usePreferences();
  const shortcuts = useShortcutStatus(preferences.revision, 'queue-empty');

  if (state.loading)
    return (
      <div className="library-empty" role="status">
        Loading queue…
      </div>
    );
  if (state.error !== undefined)
    return (
      <div className="library-error" role="alert">
        <p>{state.error}</p>
        <Button
          onClick={() => {
            model.refresh();
          }}
        >
          Refresh queue
        </Button>
      </div>
    );
  return (
    <div className="library-empty">
      <ListTodoIcon aria-hidden="true" />
      <h2>{state.tab === 'open' ? 'Nothing queued.' : 'Nothing completed yet.'}</h2>
      {state.tab === 'open' && (
        <>
          <p>Write the next prompt while you wait.</p>
          <Button
            onClick={() => {
              navigation.compose('queue');
            }}
          >
            New prompt
          </Button>
          {shortcuts?.compose === 'registered' && (
            <p className="queue-empty-shortcut">Quick compose: {shortcuts.labels.compose}</p>
          )}
        </>
      )}
    </div>
  );
}
