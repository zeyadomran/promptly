import { SegmentedControl } from '../../components/shared/SegmentedControl';
import { ToggleGroupItem } from '../../components/ui/toggle-group';
import { useQueue } from './queue-context';

export function QueueTabs() {
  const { state, model } = useQueue();
  const done = state.items.length - state.openCount;

  return (
    <SegmentedControl
      className="queue-tabs"
      aria-label="Prompt state"
      value={state.tab}
      onValueChange={(value) => {
        if (value === 'open' || value === 'done') model.tab(value);
      }}
    >
      <ToggleGroupItem
        value="open"
        aria-label={`Open prompts: ${String(state.openCount)}`}
        onFocus={() => {
          model.tab('open');
        }}
      >
        Open <span>{state.openCount}</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="done"
        aria-label={`Done prompts: ${String(done)}`}
        onFocus={() => {
          model.tab('done');
        }}
      >
        Done <span>{done}</span>
      </ToggleGroupItem>
    </SegmentedControl>
  );
}
