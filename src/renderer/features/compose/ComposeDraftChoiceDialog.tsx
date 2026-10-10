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
import { focusComposeElement, restoreComposeFocus } from './compose-focus';

export function ComposeDraftChoiceDialog() {
  const { model, state, save } = useCompose();
  const keep = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const busy = state.pending || state.assetPending;

  return (
    <Dialog
      open={state.prompt}
      onOpenChange={(open) => {
        if (!open && !busy) model.keep();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          keep.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => {
            const current = model.snapshot();

            if (current.draft === undefined) restoreComposeFocus(current.saved);
            else if (!focusComposeElement(opener.current))
              focusComposeElement(document.querySelector<HTMLElement>('[data-compose-text]'));
          });
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
            disabled={busy}
            onClick={() => {
              void model.discard();
            }}
          >
            Discard
          </Button>
          <Button
            ref={keep}
            variant="outline"
            disabled={busy}
            onClick={() => {
              model.keep();
            }}
          >
            Keep editing
          </Button>
          <Button
            disabled={busy}
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
