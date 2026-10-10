import { CornerUpLeftIcon, GripVerticalIcon, PaperclipIcon } from 'lucide-react';
import type { PointerEvent } from 'react';

import type { QueuePreview } from '../../../shared/contracts/queue';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { LibraryRowTags } from '../library/LibraryRowTags';
import { relativeTime } from '../snippets/relative-time';
import { useQueue } from './queue-context';
import { QueueMoreMenu } from './QueueMoreMenu';

export function QueueRow({
  item,
  index,
  total,
  returnLabel,
  copy,
  onEdit,
  drag
}: {
  item: QueuePreview;
  index: number;
  total: number;
  returnLabel: string | undefined;
  copy: (id: string, returnToApp?: boolean) => void;
  onEdit: (id: string) => Promise<void>;
  drag: {
    active: boolean;
    start: (event: PointerEvent<HTMLButtonElement>) => void;
    move: (event: PointerEvent<HTMLButtonElement>) => void;
    drop: () => void;
    cancel: () => void;
  };
}) {
  const { state, model } = useQueue();
  const done = item.completedAt !== null;
  const hasText = item.hasText ?? item.text.length > 0;
  const disabled = state.pending || state.loading;

  return (
    <div
      id={`queue-${item.id}`}
      data-queue-id={item.id}
      data-dragging={drag.active || undefined}
      role="option"
      aria-selected={state.selectedId === item.id}
      aria-posinset={index + 1}
      aria-setsize={total}
      className="queue-row"
      onClick={(event) => {
        if (!disabled) {
          event.currentTarget.parentElement?.focus({ preventScroll: true });
          copy(item.id);
        }
      }}
    >
      {!done && (
        <Button
          variant="ghost"
          size="icon-xs"
          data-queue-drag-handle="true"
          className="queue-drag-handle"
          aria-label={`Drag prompt at position ${String(index + 1)}. Use Alt plus arrow keys to move.`}
          disabled={disabled}
          tabIndex={state.selectedId === item.id ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onPointerDown={drag.start}
          onPointerMove={drag.move}
          onPointerUp={drag.drop}
          onPointerCancel={drag.cancel}
          onLostPointerCapture={drag.cancel}
        >
          <GripVerticalIcon aria-hidden="true" />
        </Button>
      )}
      <Checkbox
        checked={done}
        disabled={disabled}
        tabIndex={state.selectedId === item.id ? 0 : -1}
        aria-label={done ? 'Reopen prompt' : 'Mark prompt done'}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onCheckedChange={() => {
          void model.complete(item.id);
        }}
      />
      <div className="queue-row-content">
        <div className="queue-row-text" data-empty={!hasText || undefined}>
          {hasText ? item.text : 'Attachment only'}
        </div>
        <div className="queue-row-meta">
          <span>
            {index + 1} of {total}
          </span>
          <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
          {item.attachments.length > 0 && (
            <span
              className="queue-attachment-count"
              aria-label={`${String(item.attachments.length)} attachments`}
            >
              <PaperclipIcon aria-hidden="true" />
              {item.attachments.length}
            </span>
          )}
          {item.tags.length > 0 && <LibraryRowTags tags={item.tags} />}
        </div>
      </div>
      <div className="queue-row-actions">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Copy and return"
          tabIndex={state.selectedId === item.id ? 0 : -1}
          disabled={disabled || !hasText || returnLabel === undefined}
          title={
            returnLabel === undefined
              ? 'No previous app to return to.'
              : `Copy, then switch back to ${returnLabel}. Paste it yourself.`
          }
          onClick={(event) => {
            event.stopPropagation();
            copy(item.id, true);
          }}
        >
          <CornerUpLeftIcon aria-hidden="true" />
        </Button>
        <QueueMoreMenu
          item={item}
          onEdit={onEdit}
          tabIndex={state.selectedId === item.id ? 0 : -1}
        />
      </div>
    </div>
  );
}
