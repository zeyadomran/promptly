import { Tabs } from 'radix-ui';

import { Button } from '../../components/ui/button';
import { useQueue } from './queue-context';

export function QueueHeader() {
  const { state } = useQueue();
  const done = state.items.length - state.openCount;

  return (
    <div className="queue-header">
      <Tabs.List className="queue-tabs" aria-label="Prompt state">
        <Tabs.Trigger value="open" asChild>
          <Button variant="ghost" size="sm">
            Open <span>{state.openCount}</span>
          </Button>
        </Tabs.Trigger>
        <Tabs.Trigger value="done" asChild>
          <Button variant="ghost" size="sm">
            Done <span>{done}</span>
          </Button>
        </Tabs.Trigger>
      </Tabs.List>
      <span className="queue-header-note">
        {state.tab === 'open' ? 'Manual order' : 'Newest completed first'}
      </span>
    </div>
  );
}
