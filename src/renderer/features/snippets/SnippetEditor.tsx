import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { AttachmentStrip } from '../attachments/AttachmentStrip';
import { stageDroppedAttachments } from '../attachments/stage-dropped-attachments';
import { CopyDraftMenu } from '../compose/CopyDraftMenu';
import { draftKeyCommand } from '../compose/draft-keyboard';
import { DraftTags } from '../compose/DraftTags';
import { VariableStatus } from '../compose/VariableStatus';
import { useLibrarySelection } from '../library/library-context';
import { editorCancelCommand } from '../library/library-keyboard';
import { usePreferences } from '../settings/settings-context';
import { useSnippetSession } from './snippet-context';
import { useSnippetDrawing } from './use-snippet-drawing';

export function SnippetEditor() {
  const { session, state } = useSnippetSession();
  const selection = useLibrarySelection();
  const { settings } = usePreferences();
  const drawing = useSnippetDrawing();
  const cancel = () => {
    if (session.dirty) {
      session.warnModeChange();
      return;
    }

    void session.discard().then(() => {
      if (!session.snapshot().editing) selection.focusSearch();
    });
  };

  const save = async () => {
    if (await session.save()) selection.focusSearch();
  };

  return (
    <div
      className="snippet-editor"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const token = state.draftToken;

        if (token === undefined || state.pending || state.assetPending) return;
        void stageDroppedAttachments(token, Array.from(event.dataTransfer.files), {
          current: () => session.snapshot().draftToken === token,
          busy: (pending) => {
            session.setAssetPending(token, pending);
          },
          change: (attachments) => {
            session.refreshAttachments(attachments, token);
          },
          report: (message) => {
            session.report(message);
          }
        });
      }}
      onKeyDown={(event) => {
        const command = draftKeyCommand(event);

        if (command === undefined || command === 'save-return') return;
        event.preventDefault();
        event.stopPropagation();
        if (command === 'save') void save();
        if (command === 'close') cancel();
        if (command === 'paste')
          event.currentTarget.querySelector<HTMLButtonElement>('[data-paste-attachment]')?.click();
      }}
    >
      <div className="snippet-edit-header">
        <h2>Edit snippet</h2>
      </div>
      <label className="sr-only" htmlFor="snippet-edit-text">
        Edit snippet text
      </label>
      <Textarea
        id="snippet-edit-text"
        data-snippet-editor
        autoFocus
        maxLength={1_000_000}
        value={state.draft}
        readOnly={state.pending}
        aria-invalid={state.error !== undefined}
        aria-describedby={state.error === undefined ? undefined : 'snippet-edit-error'}
        onChange={(event) => {
          session.change(event.target.value);
        }}
        onKeyDown={(event) => {
          if (
            !state.pending &&
            editorCancelCommand(
              {
                key: event.key,
                code: event.code,
                meta: event.metaKey,
                ctrl: event.ctrlKey,
                alt: event.altKey,
                shift: event.shiftKey,
                repeat: event.repeat,
                composing: event.nativeEvent.isComposing || event.key === 'Process',
                prevented: event.defaultPrevented,
                altGraph: event.getModifierState('AltGraph')
              },
              settings.localShortcuts
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            cancel();
          }
        }}
      />
      <VariableStatus text={state.draft} />
      <DraftTags
        key={state.draftToken}
        selectedIds={state.draftTags}
        pending={state.pending || state.assetPending}
        onBusy={(pending) => {
          if (state.draftToken !== undefined) session.setAssetPending(state.draftToken, pending);
        }}
        onChange={(ids) => {
          if (session.snapshot().draftToken === state.draftToken) session.changeTags(ids);
        }}
      />
      <AttachmentStrip
        key={state.draftToken}
        attachments={state.draftAttachments}
        draftToken={state.draftToken}
        editable
        pending={state.pending || state.assetPending}
        saveTarget="snippet"
        onDraw={() => {
          void drawing.open();
        }}
        onAnnotate={(id) => {
          void drawing.open(id);
        }}
        onBusy={(pending, token) => {
          session.setAssetPending(token, pending);
        }}
        onChange={(attachments, token) => {
          session.refreshAttachments(attachments, token);
        }}
        onError={(message, token) => {
          if (session.snapshot().draftToken === token) session.report(message);
        }}
      />
      {state.error !== undefined && (
        <p id="snippet-edit-error" role="alert" className="snippet-error">
          {state.error}
        </p>
      )}
      <div className="snippet-editor-actions">
        <CopyDraftMenu
          source={session.currentCopySource}
          hasText={state.draft.trim() !== ''}
          pending={state.pending || state.assetPending}
        />
        <Button
          variant="outline"
          disabled={state.pending || state.assetPending}
          onClick={() => {
            cancel();
          }}
        >
          Cancel
        </Button>
        <Button
          disabled={state.pending || state.assetPending || state.missing}
          aria-disabled={state.draft.trim() === '' && state.draftAttachments.length === 0}
          onClick={() => {
            void save();
          }}
        >
          {state.pending ? 'Applying' : state.conflict ? 'Replace saved text' : 'Apply changes'}
        </Button>
      </div>
    </div>
  );
}
