import { Textarea } from '../../components/ui/textarea';
import { useDrawing } from '../drawing/useDrawing';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { useCompose } from './compose-context';
import { ComposeActions } from './ComposeActions';
import { ComposeHeader } from './ComposeHeader';
import { ComposeToolbar } from './ComposeToolbar';
import { draftKeyCommand } from './draft-keyboard';

export function ComposePane() {
  const { model, state, save } = useCompose();
  const copy = useWorkflowCopy();
  const drawing = useDrawing();
  const draft = state.draft;

  if (draft === undefined) return null;
  const busy = state.pending || state.assetPending || drawing.isOpen;

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
      <ComposeHeader busy={busy} />
      <div className="compose-body">
        <label className="sr-only" htmlFor="compose-text">
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
        <ComposeToolbar />
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
