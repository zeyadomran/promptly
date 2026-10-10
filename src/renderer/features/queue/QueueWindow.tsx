import './queue.css';

import { Tabs } from 'radix-ui';

import type { SizeMode } from '../../../shared/contracts/window';
import { Button } from '../../components/ui/button';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { useQueue } from './queue-context';
import { queueItems } from './queue-state';
import { QueueDetail } from './QueueDetail';
import { QueueEmpty } from './QueueEmpty';
import { QueueFooter } from './QueueFooter';
import { QueueHeader } from './QueueHeader';
import { QueueList } from './QueueList';
import { QueueToast } from './QueueToast';
import { useQueueKeyboard } from './use-queue-keyboard';

export function QueueWindow({
  mode,
  active = true,
  onEdit,
  onAnnotate,
  onShowLibrary
}: {
  mode: SizeMode;
  active?: boolean;
  onEdit: (id: string) => Promise<void>;
  onAnnotate?: ((id: string, attachmentId: string) => Promise<void>) | undefined;
  onShowLibrary?: ((id: string) => Promise<void>) | undefined;
}) {
  const { state, model } = useQueue();
  const workflow = useWorkflowCopy();
  const copy = (id: string, returnToApp = false) => {
    if (!active || state.pending || state.loading) return;
    model.select(id);
    if (state.items.find((item) => item.id === id)?.hasText === false) return;
    void workflow.requestCopy(
      { kind: 'queue', id },
      {
        return: returnToApp,
        feedback: false,
        onCopied: (outcome) => {
          model.copied(id, outcome);
        }
      }
    );
  };

  useQueueKeyboard(active, copy);
  return (
    <Tabs.Root
      className="queue-window"
      data-mode={mode}
      hidden={!active}
      inert={!active}
      value={state.tab}
      onValueChange={(value) => {
        if (value === 'open' || value === 'done') model.tab(value);
      }}
    >
      <QueueHeader />
      {state.error !== undefined && state.items.length > 0 && (
        <div className="queue-error" role="alert">
          <span>{state.error}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              model.refresh();
            }}
          >
            Refresh queue
          </Button>
        </div>
      )}
      <div className="queue-layout">
        <Tabs.Content value={state.tab} className="queue-list-column">
          {queueItems(state).length === 0 ? (
            <QueueEmpty />
          ) : (
            <QueueList copy={copy} returnLabel={workflow.returnLabel} onEdit={onEdit} />
          )}
        </Tabs.Content>
        {mode === 'regular' && (
          <QueueDetail
            copy={copy}
            returnLabel={workflow.returnLabel}
            onEdit={onEdit}
            onAnnotate={onAnnotate}
          />
        )}
      </div>
      <QueueFooter />
      <QueueToast onShowLibrary={onShowLibrary} />
      <span className="sr-only" role="status" aria-live="polite">
        {state.announcement}
      </span>
    </Tabs.Root>
  );
}
