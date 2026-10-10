import './drawing.css';

import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import { drawingKeyboard } from './drawing-keyboard';
import type { DrawingSession } from './drawing-session';
import type { DrawingState } from './drawing-state';
import { DrawingCanvas } from './DrawingCanvas';
import { DrawingDiscardDialog } from './DrawingDiscardDialog';
import { DrawingFooter } from './DrawingFooter';
import { DrawingTextField } from './DrawingTextField';
import { DrawingToolbar } from './DrawingToolbar';

export function DrawingEditor({
  session,
  state,
  opener
}: {
  session: DrawingSession;
  state: DrawingState;
  opener: RefObject<HTMLElement | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    loading = state.pending === 'load';

  useEffect(() => {
    if (state.isOpen && !loading) canvas.current?.focus();
  }, [state.isOpen, loading]);
  return (
    <>
      <Dialog
        open={state.isOpen}
        onOpenChange={(open) => {
          if (!open) session.requestClose();
        }}
      >
        {state.isOpen && (
          <DialogContent
            className="drawing-dialog sm:max-w-none"
            showCloseButton={false}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              if (canvas.current?.dataset['drawingGesture'] === 'active') return;
              if (state.textAt !== undefined) {
                session.commands.cancelText();
                canvas.current?.focus();
              } else session.requestClose();
            }}
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = opener.current;

              if (target?.isConnected === true && target.getClientRects().length > 0)
                target.focus();
              else
                Array.from(
                  document.querySelectorAll<HTMLElement>(
                    '[data-drawing-fallback],[data-promptly-search]'
                  )
                )
                  .find((element) => element.getClientRects().length > 0)
                  ?.focus();
            }}
            onKeyDown={(event) => {
              if (
                event.target instanceof HTMLElement &&
                event.target.closest('input,textarea,[contenteditable=true]') !== null
              )
                return;
              if (drawingKeyboard(session, event.nativeEvent)) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {state.scene?.backgroundAttachmentId === undefined ? 'Drawing' : 'Annotate image'}
              </DialogTitle>
              <DialogDescription>
                The original image stays unchanged. Save stages this drawing in your draft.
              </DialogDescription>
            </DialogHeader>
            <DrawingToolbar session={session} state={state} />
            {loading ? (
              <p role="status">Loading drawing…</p>
            ) : (
              state.scene !== undefined && (
                <DrawingCanvas session={session} state={state} canvasRef={canvas} />
              )
            )}
            {state.textAt !== undefined && (
              <DrawingTextField session={session} focusCanvas={() => canvas.current?.focus()} />
            )}
            <p id="drawing-keyboard-hint" className="drawing-hint">
              Canvas: Enter adds a shape; arrows move it; Shift moves 10px; Page Up/Down selects;
              Del removes.
            </p>
            {state.error !== undefined && !state.confirm && (
              <p role="alert" className="drawing-error">
                {state.error}
              </p>
            )}
            <p className="sr-only" role="status" aria-live="polite">
              {state.announcement}
            </p>
            <DrawingFooter session={session} state={state} />
          </DialogContent>
        )}
      </Dialog>
      <DrawingDiscardDialog
        session={session}
        state={state}
        focusCanvas={() => canvas.current?.focus()}
      />
    </>
  );
}
