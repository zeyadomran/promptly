import { AttachmentStrip } from '../attachments/AttachmentStrip';
import { useDrawing } from '../drawing/useDrawing';
import { useCompose } from './compose-context';
import { DraftTags } from './DraftTags';
import { VariableStatus } from './VariableStatus';

export function ComposeToolbar() {
  const { model, state } = useCompose();
  const drawing = useDrawing();
  const draft = state.draft;

  if (draft === undefined) return null;
  const token = draft.draftToken;
  const busy = state.pending || state.assetPending || drawing.isOpen;
  const draw = (attachmentId?: string) => {
    void drawing
      .open({
        draftToken: token,
        attachments: draft.attachments,
        ...(attachmentId === undefined ? {} : { attachmentId }),
        onSaved: (attachments) => {
          model.refreshAttachments(attachments, token);
        }
      })
      .catch(() => {
        if (model.snapshot().draft?.draftToken === token)
          model.report('Unable to open the drawing editor. Your draft is kept.');
      });
  };

  return (
    <AttachmentStrip
      key={token}
      attachments={draft.attachments}
      draftToken={token}
      editable
      compact
      pending={busy}
      intakeStart={
        <DraftTags
          key={token}
          selectedIds={draft.tagIds}
          compact
          pending={busy}
          onBusy={(pending) => {
            model.setAssetPending(token, pending);
          }}
          onChange={(ids) => {
            if (model.snapshot().draft?.draftToken === token) model.changeTags(ids);
          }}
        />
      }
      intakeEnd={
        <div className="compose-status">
          <VariableStatus text={draft.text} compact />
          <span title={`${draft.text.length.toLocaleString()} characters`}>
            {draft.text.length.toLocaleString()} chars
          </span>
        </div>
      }
      onDraw={() => {
        draw();
      }}
      onAnnotate={draw}
      onBusy={(pending, owner) => {
        model.setAssetPending(owner, pending);
      }}
      onChange={(attachments, owner) => {
        model.refreshAttachments(attachments, owner);
      }}
      onError={(message, owner) => {
        if (model.snapshot().draft?.draftToken === owner) model.report(message);
      }}
    />
  );
}
