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
import type { DrawingSession } from './drawing-session';
import type { DrawingState } from './drawing-state';

export function DrawingDiscardDialog({
  session,
  state,
  focusCanvas
}: {
  session: DrawingSession;
  state: DrawingState;
  focusCanvas: () => void;
}) {
  const keep = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={state.confirm}
      onOpenChange={(open) => {
        if (!open && state.pending === undefined) session.keep();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          keep.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (session.snapshot().isOpen) focusCanvas();
        }}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Keep your drawing?</DialogTitle>
          <DialogDescription>
            Your drawing has unsaved changes. Save it to the draft or keep drawing.
          </DialogDescription>
        </DialogHeader>
        {state.error !== undefined && (
          <p role="alert" className="drawing-error">
            {state.error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            disabled={state.pending !== undefined}
            onClick={() => {
              session.discard();
            }}
          >
            Discard
          </Button>
          <Button
            ref={keep}
            variant="outline"
            disabled={state.pending !== undefined}
            onClick={() => {
              session.keep();
            }}
          >
            Keep drawing
          </Button>
          <Button
            disabled={state.pending !== undefined || state.scene?.elements.length === 0}
            onClick={() => {
              void session.output('save');
            }}
          >
            Save to {state.saveTarget}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
