import { CornerUpLeft, Save } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { useCompose } from './compose-context';
import { CopyDraftMenu } from './CopyDraftMenu';

export function ComposeActions() {
  const { model, state, save } = useCompose();
  const copy = useWorkflowCopy();
  const draft = state.draft;

  if (draft === undefined) return null;
  const busy = state.pending || state.assetPending;
  const empty = draft.text.trim() === '' && draft.attachments.length === 0;
  const confirm = (returnToApp = false) => {
    void save({ return: returnToApp }).then((saved) => {
      if (!saved && empty) document.querySelector<HTMLElement>('[data-compose-text]')?.focus();
    });
  };

  const returning = draft.fromGlobal && copy.returnLabel !== undefined;

  return (
    <footer className="compose-actions">
      <div className="compose-action-buttons">
        <CopyDraftMenu
          source={model.currentCopySource}
          hasText={draft.text.trim() !== ''}
          pending={busy}
        />
        <Button
          variant={returning ? 'default' : 'outline'}
          disabled={busy || copy.returnLabel === undefined}
          aria-disabled={empty || copy.returnLabel === undefined}
          title={
            copy.returnLabel === undefined
              ? 'No previous app to return to. Ctrl+Shift+Enter to save and return when available.'
              : `Save, then switch back to ${copy.returnLabel} (Ctrl+Shift+Enter).`
          }
          onClick={() => {
            confirm(true);
          }}
        >
          <CornerUpLeft aria-hidden="true" />
          {state.pending && returning ? 'Saving' : 'Save and return'}
        </Button>
        <Button
          variant={returning ? 'outline' : 'default'}
          disabled={busy}
          aria-disabled={empty}
          title={
            draft.destination === 'queue'
              ? 'Save to Queue (Ctrl+Enter)'
              : 'Save to Library (Ctrl+Enter)'
          }
          aria-describedby={empty ? 'compose-error' : undefined}
          onClick={() => {
            confirm();
          }}
        >
          <Save aria-hidden="true" />
          {state.pending && !returning
            ? 'Saving'
            : draft.source === undefined
              ? 'Save'
              : 'Apply changes'}
        </Button>
      </div>
    </footer>
  );
}
