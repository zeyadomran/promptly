import { X } from 'lucide-react';

import { SegmentedControl } from '../../components/shared/SegmentedControl';
import { Button } from '../../components/ui/button';
import { ToggleGroupItem } from '../../components/ui/toggle-group';
import { useCompose } from './compose-context';

export function ComposeHeader({ busy }: { busy: boolean }) {
  const { model, state } = useCompose();
  const draft = state.draft;

  if (draft === undefined) return null;
  const title =
    draft.source !== undefined
      ? 'Edit prompt'
      : draft.destination === 'library'
        ? 'New snippet'
        : 'New prompt';

  return (
    <header className="compose-header">
      <h2 title={title}>{title}</h2>
      <span className="compose-draft-pill">Draft</span>
      <SegmentedControl
        className="compose-destination"
        value={draft.destination}
        aria-label="Save destination"
        disabled={busy || draft.source !== undefined}
        onValueChange={(value) => {
          if (value === 'queue' || value === 'library') model.changeDestination(value);
        }}
      >
        <ToggleGroupItem value="queue" title="Save to Queue">
          Queue
        </ToggleGroupItem>
        <ToggleGroupItem value="library" title="Save to Library">
          Library
        </ToggleGroupItem>
      </SegmentedControl>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close draft"
        title="Close draft (Esc)"
        disabled={busy}
        onClick={() => {
          model.requestClose();
        }}
      >
        <X aria-hidden="true" />
      </Button>
    </header>
  );
}
