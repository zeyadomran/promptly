import type { QueueItem } from '../../../shared/contracts/queue';
import { countTemplateNames } from '../../../shared/workflows/variable-count';
import { Button } from '../../components/ui/button';
import { AttachmentStrip } from '../attachments/AttachmentStrip';
import { LibraryRowTags } from '../library/LibraryRowTags';
import { usePreferences } from '../settings/settings-context';
import { relativeTime } from '../snippets/relative-time';
import { VariableCount } from '../variables/VariableCount';
import { VariableText } from '../variables/VariableText';
import { useQueue } from './queue-context';
import { QueueMoreMenu } from './QueueMoreMenu';

export function QueueDetail({
  copy,
  returnLabel,
  onEdit,
  onAnnotate
}: {
  copy: (id: string, returnToApp?: boolean) => void;
  returnLabel: string | undefined;
  onEdit: (id: string) => Promise<void>;
  onAnnotate?: ((id: string, attachmentId: string) => Promise<void>) | undefined;
}) {
  const { state, model } = useQueue();
  const { settings } = usePreferences();
  const item: QueueItem | null = state.detail;

  if (item?.id !== state.selectedId)
    return (
      <aside className="queue-detail queue-detail-empty" aria-label="Prompt detail">
        <p role="status">
          {state.detailLoading ? 'Loading full prompt…' : 'Select a prompt to see its full text.'}
        </p>
      </aside>
    );
  const disabled = state.loading || state.pending || state.detailLoading;
  const hasText = item.text.trim().length > 0;
  const count = countTemplateNames(item.text);
  const edit = () => {
    void onEdit(item.id).catch(() => {
      model.report('Unable to open this prompt for editing.');
    });
  };

  return (
    <aside className="queue-detail" aria-label="Prompt detail">
      <div className="queue-detail-header">
        <h2>Queued prompt</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            void model.complete(item.id);
          }}
        >
          {item.completedAt === null ? 'Mark done' : 'Reopen'}
        </Button>
      </div>
      <div className="queue-detail-body">
        <div className="queue-detail-meta">
          <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
          <VariableCount count={count} />
          {item.tags.length > 0 && <LibraryRowTags tags={item.tags} />}
          {item.tags.length > 0 && (
            <span className="sr-only">Tags: {item.tags.map((tag) => tag.name).join(', ')}</span>
          )}
        </div>
        <pre className="queue-full-text">
          {hasText ? (
            settings.promptVariables ? (
              <VariableText text={item.text} />
            ) : (
              item.text
            )
          ) : (
            <span className="queue-muted">Attachment only</span>
          )}
        </pre>
        <AttachmentStrip
          key={item.id}
          attachments={item.attachments}
          pending={disabled}
          onError={(message) => {
            model.report(message);
          }}
          {...(onAnnotate === undefined
            ? {}
            : {
                onAnnotate: (attachmentId: string) => {
                  void onAnnotate(item.id, attachmentId).catch(() => {
                    model.report('Unable to annotate this attachment.');
                  });
                }
              })}
        />
        <p className="queue-note">
          Copy puts text on the clipboard. Attachments are copied one at a time.
        </p>
      </div>
      <div className="queue-detail-actions">
        <Button
          disabled={disabled || !hasText}
          title={!hasText ? 'No text to copy. Attachments are copied separately.' : undefined}
          onClick={() => {
            copy(item.id);
          }}
        >
          Copy
        </Button>
        <Button
          variant="outline"
          disabled={disabled || !hasText || returnLabel === undefined}
          title={
            returnLabel === undefined
              ? 'No previous app to return to.'
              : `Copy, then switch back to ${returnLabel}. Paste it yourself.`
          }
          onClick={() => {
            copy(item.id, true);
          }}
        >
          Copy and return
        </Button>
        <Button variant="outline" disabled={disabled} onClick={edit}>
          Edit
        </Button>
        <QueueMoreMenu item={item} onEdit={onEdit} />
      </div>
    </aside>
  );
}
