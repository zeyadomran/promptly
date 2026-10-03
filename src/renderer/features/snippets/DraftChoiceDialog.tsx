import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import { useSnippetSession } from './snippet-context';

export function DraftChoiceDialog({ resumeEditing }: { resumeEditing: () => Promise<void> }) {
  const { session, state } = useSnippetSession();
  const keep = () => {
    session.keep();
    void resumeEditing().catch(() => {
      session.report('Unable to return to the editor. Your draft is kept.');
    });
  };

  return (
    <Dialog
      open={state.prompt}
      onOpenChange={(open) => {
        if (!open && !state.pending) keep();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          (
            document.querySelector<HTMLElement>('[data-snippet-editor]') ??
            document.querySelector<HTMLElement>('[data-promptly-search]')
          )?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Keep your unsaved changes?</DialogTitle>
          <DialogDescription>
            Your draft is kept while changing the selection or window mode. Apply it, discard it, or
            continue editing.
          </DialogDescription>
        </DialogHeader>
        {state.error !== undefined && <p role="alert">{state.error}</p>}
        <DialogFooter>
          <Button
            className="draft-discard"
            variant="ghost"
            disabled={state.pending}
            onClick={() => {
              session.discard();
            }}
          >
            Discard
          </Button>
          <Button variant="outline" disabled={state.pending} onClick={keep}>
            Keep editing
          </Button>
          <Button
            disabled={state.pending || state.missing}
            onClick={() => {
              void session.save();
            }}
          >
            Apply changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
