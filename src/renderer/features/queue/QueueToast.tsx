import { XIcon } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { workflowCopyFeedback } from '../workflows/copy-feedback';
import { useQueue } from './queue-context';

export function QueueToast({
  onShowLibrary
}: {
  onShowLibrary?: ((id: string) => Promise<void>) | undefined;
}) {
  const { state, model } = useQueue();
  const toast = state.toast;

  if (toast === undefined) return null;
  const message =
    toast.kind === 'copied'
      ? workflowCopyFeedback(toast.outcome)
      : toast.kind === 'saved'
        ? 'Saved to library'
        : toast.kind === 'reopened'
          ? 'Reopened'
          : toast.message;
  const open =
    toast.kind === 'copied' &&
    state.items.some((item) => item.id === toast.id && item.completedAt === null);

  return (
    <div className="queue-toast" role="status">
      <span>{message}</span>
      {(toast.kind === 'completion' || toast.kind === 'delete') && (
        <Button
          size="xs"
          variant="ghost"
          disabled={state.pending || state.loading}
          onClick={() => {
            void model.undo();
          }}
        >
          Undo
        </Button>
      )}
      {open && (
        <Button
          size="xs"
          variant="ghost"
          disabled={state.pending || state.loading}
          onClick={() => {
            void model.complete(toast.id);
          }}
        >
          Mark done
        </Button>
      )}
      {toast.kind === 'saved' && onShowLibrary !== undefined && (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            void onShowLibrary(toast.snippetId)
              .then(() => {
                model.dismiss();
              })
              .catch(() => {
                model.report('Unable to show the saved snippet.');
              });
          }}
        >
          Show
        </Button>
      )}
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Dismiss notification"
        onClick={() => {
          model.dismiss();
        }}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
