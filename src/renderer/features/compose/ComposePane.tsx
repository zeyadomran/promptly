import { X } from 'lucide-react';

import { SegmentedControl } from '../../components/shared/SegmentedControl';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ToggleGroupItem } from '../../components/ui/toggle-group';
import { AttachmentStrip } from '../attachments/AttachmentStrip';
import { useDrawing } from '../drawing/useDrawing';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { useCompose } from './compose-context';
import { ComposeActions } from './ComposeActions';
import { draftKeyCommand } from './draft-keyboard';
import { DraftTags } from './DraftTags';
import { VariableStatus } from './VariableStatus';

export function ComposePane() {
  const { model, state, save } = useCompose();
  const copy = useWorkflowCopy();
  const drawing = useDrawing();
  const draft = state.draft;

  if (draft === undefined) return null;
  const busy = state.pending || state.assetPending || drawing.isOpen;
  const token = draft.draftToken;
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
    <aside
      className="compose-pane"
      aria-label={draft.source === undefined ? 'New prompt' : 'Edit queued prompt'}
      onKeyDown={(event) => {
        const command = draftKeyCommand(event);

        if (
          command === undefined ||
          (event.target instanceof Element &&
            event.target.closest('[data-promptly-overlay]') !== null)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (command === 'save') void save();
        if (command === 'save-return' && copy.returnLabel !== undefined)
          void save({ return: true });
        if (command === 'close') model.requestClose();
        if (command === 'paste')
          event.currentTarget.querySelector<HTMLButtonElement>('[data-paste-attachment]')?.click();
      }}
    >
      <header className="compose-header">
        <div>
          <span className="compose-eyebrow">
            {draft.source === undefined ? 'COMPOSE' : 'EDIT QUEUED PROMPT'}
          </span>
          <h2>
            {draft.source === undefined
              ? draft.destination === 'library'
                ? 'New snippet'
                : 'New prompt'
              : 'Edit prompt'}{' '}
            <span className="compose-draft-pill">Draft</span>
          </h2>
        </div>
        <div className="compose-header-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close draft"
            disabled={busy}
            onClick={() => {
              model.requestClose();
            }}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </header>
      <div className="compose-body">
        <div className="compose-destination">
          <span>Add to</span>
          <SegmentedControl
            value={draft.destination}
            aria-label="Save destination"
            disabled={busy || draft.source !== undefined}
            onValueChange={(value) => {
              if (value === 'queue' || value === 'library') model.changeDestination(value);
            }}
          >
            <ToggleGroupItem value="queue">Queue</ToggleGroupItem>
            <ToggleGroupItem value="library">Library</ToggleGroupItem>
          </SegmentedControl>
        </div>
        <label className="compose-text-label" htmlFor="compose-text">
          Prompt text
        </label>
        <Textarea
          id="compose-text"
          data-compose-text
          autoFocus
          maxLength={1_000_000}
          value={draft.text}
          readOnly={state.pending}
          placeholder="Write or paste the text you want to reuse."
          aria-describedby={state.error === undefined ? undefined : 'compose-error'}
          aria-invalid={state.error !== undefined}
          onChange={(event) => {
            model.changeText(event.target.value);
          }}
        />
        <DraftTags
          key={token}
          selectedIds={draft.tagIds}
          pending={busy}
          onBusy={(pending) => {
            model.setAssetPending(token, pending);
          }}
          onChange={(ids) => {
            if (model.snapshot().draft?.draftToken === token) model.changeTags(ids);
          }}
        />
        <AttachmentStrip
          key={token}
          attachments={draft.attachments}
          draftToken={token}
          editable
          pending={busy}
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
        <div className="compose-status">
          <VariableStatus text={draft.text} />
          <span>{draft.text.length.toLocaleString()} characters</span>
        </div>
        {state.error !== undefined && (
          <p id="compose-error" role="alert" className="snippet-error">
            {state.error}
          </p>
        )}
      </div>
      <ComposeActions />
    </aside>
  );
}
