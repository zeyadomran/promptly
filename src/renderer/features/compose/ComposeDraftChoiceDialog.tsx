import { useRef } from 'react';

import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import { useCompose } from './compose-context';

export function ComposeDraftChoiceDialog() {
  const { model, state, save } = useCompose();
  const keep = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={state.prompt}
      onOpenChange={(open) => {
        if (!open && !state.pending) model.keep();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          keep.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (state.pending) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.querySelector<HTMLElement>('[data-compose-text]')?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Keep your unsaved draft?</DialogTitle>
          <DialogDescription>Save the draft, discard it, or continue editing.</DialogDescription>
        </DialogHeader>
        {state.error !== undefined && <p role="alert">{state.error}</p>}
        <DialogFooter>
          <Button
            variant="ghost"
            disabled={state.pending}
            onClick={() => {
              void model.discard();
            }}
          >
            Discard
          </Button>
          <Button
            ref={keep}
            variant="outline"
            disabled={state.pending}
            onClick={() => {
              model.keep();
            }}
          >
            Keep editing
          </Button>
          <Button
            disabled={state.pending}
            onClick={() => {
              void save();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
