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

export function DraftChoiceDialog({
  active = true,
  resumeEditing
}: {
  active?: boolean;
  resumeEditing: () => Promise<void>;
}) {
  const { session, state } = useSnippetSession();
  const keep = () => {
    session.keep();
    void resumeEditing().catch(() => {
      session.report('Unable to return to the editor. Your draft is kept.');
    });
  };

  return (
    <Dialog
      open={active && state.prompt}
      onOpenChange={(open) => {
        if (active && !open && !state.pending) keep();
      }}
    >
      {active && (
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (document.querySelector('[data-shell-library][hidden]') !== null) return;
            (
              document.querySelector<HTMLElement>('[data-snippet-editor]') ??
              document.querySelector<HTMLElement>('[data-promptly-search]')
            )?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Keep your unsaved changes?</DialogTitle>
            <DialogDescription>
              Your draft is kept while changing the selection or window mode. Apply it, discard it,
              or continue editing.
            </DialogDescription>
          </DialogHeader>
          {state.error !== undefined && <p role="alert">{state.error}</p>}
          <DialogFooter>
            <Button variant="ghost" disabled={state.pending} onClick={keep}>
              Keep editing
            </Button>
            <Button
              variant="outline"
              disabled={state.pending}
              onClick={() => {
                session.discard();
              }}
            >
              Discard changes
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
      )}
    </Dialog>
  );
}
