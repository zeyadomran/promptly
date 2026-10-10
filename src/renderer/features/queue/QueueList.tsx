import { useEffect, useRef } from 'react';

import { useQueue } from './queue-context';
import { queueItems } from './queue-state';
import { QueueRow } from './QueueRow';
import { useQueueReorder } from './use-queue-reorder';

export function QueueList({
  copy,
  returnLabel,
  onEdit
}: {
  copy: (id: string, returnToApp?: boolean) => void;
  returnLabel: string | undefined;
  onEdit: (id: string) => Promise<void>;
}) {
  const { state, model } = useQueue();
  const items = queueItems(state);
  const list = useRef<HTMLDivElement>(null);
  const drag = useQueueReorder(
    model,
    items.map((item) => item.id),
    state.pending || state.loading || state.tab === 'done',
    state.revision
  );
  const indexed = new Map(items.map((item) => [item.id, item]));

  useEffect(() => {
    if (state.selectedId !== null)
      document.getElementById(`queue-${state.selectedId}`)?.scrollIntoView({ block: 'nearest' });
  }, [state.selectedId, state.revealVersion]);
  return (
    <div
      ref={list}
      className="queue-list"
      role="listbox"
      aria-label={state.tab === 'open' ? 'Open prompts' : 'Completed prompts'}
      tabIndex={0}
      aria-busy={state.loading}
      aria-activedescendant={state.selectedId === null ? undefined : `queue-${state.selectedId}`}
    >
      {drag.ids.map((id, index) => {
        const item = indexed.get(id);

        return item === undefined ? null : (
          <QueueRow
            key={id}
            item={item}
            index={index}
            total={items.length}
            returnLabel={returnLabel}
            copy={copy}
            onEdit={onEdit}
            drag={drag.row(id)}
          />
        );
      })}
    </div>
  );
}
