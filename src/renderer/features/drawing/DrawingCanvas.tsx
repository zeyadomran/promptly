import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import { hitElement } from './drawing-elements';
import { drawingKeyboard } from './drawing-keyboard';
import { beginGesture, type DrawingGesture, moveGesture } from './drawing-pointer';
import { renderDrawing } from './drawing-render';
import type { DrawingSession } from './drawing-session';
import type { DrawingState } from './drawing-state';

export function DrawingCanvas({
  session,
  state,
  canvasRef
}: {
  session: DrawingSession;
  state: DrawingState;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const wrapper = useRef<HTMLDivElement>(null),
    gesture = useRef<DrawingGesture | undefined>(undefined),
    pointerId = useRef<number | undefined>(undefined);
  const [preview, setPreview] = useState<DrawingGesture | undefined>(),
    [bitmap, setBitmap] = useState<ImageBitmap | undefined>();
  const scene = state.scene,
    canvasWidth = scene?.width,
    canvasHeight = scene?.height;

  useEffect(() => {
    let active = true,
      owned: ImageBitmap | undefined;

    if (state.background !== undefined)
      void createImageBitmap(new Blob([new Uint8Array(state.background.png)]))
        .then((image) => {
          if (!active) {
            image.close();
            return;
          }

          owned = image;
          setBitmap(image);
        })
        .catch(() => {
          if (active) session.report('Unable to load the drawing background.');
        });
    return () => {
      active = false;
      owned?.close();
    };
  }, [state.background, session]);
  useEffect(() => {
    const canvas = canvasRef.current,
      context = canvas?.getContext('2d');

    if (context === undefined || context === null || scene === undefined) return;
    try {
      renderDrawing(context, scene, bitmap, state.selectedId, preview?.preview);
    } catch {
      session.report('Unable to render the drawing. Your scene is kept.');
    }
  }, [canvasRef, scene, bitmap, state.selectedId, preview, session]);
  useEffect(() => {
    const element = wrapper.current,
      canvas = canvasRef.current;

    if (
      element === null ||
      canvas === null ||
      canvasWidth === undefined ||
      canvasHeight === undefined
    )
      return;
    const observer = new ResizeObserver((entries) => {
      const bounds = entries[0]?.contentRect;

      if (bounds === undefined) return;
      const scale = Math.min(bounds.width / canvasWidth, bounds.height / canvasHeight, 1);

      canvas.style.width = `${String(Math.max(1, canvasWidth * scale))}px`;
      canvas.style.height = `${String(Math.max(1, canvasHeight * scale))}px`;
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [canvasRef, canvasWidth, canvasHeight]);
  if (scene === undefined) return null;
  const point = (event: { clientX: number; clientY: number }) => {
    const bounds = canvasRef.current?.getBoundingClientRect();

    return {
      x: Math.max(
        0,
        Math.min(
          scene.width,
          bounds === undefined ? 0 : ((event.clientX - bounds.left) * scene.width) / bounds.width
        )
      ),
      y: Math.max(
        0,
        Math.min(
          scene.height,
          bounds === undefined ? 0 : ((event.clientY - bounds.top) * scene.height) / bounds.height
        )
      )
    };
  };

  const cancelGesture = () => {
    gesture.current = undefined;
    pointerId.current = undefined;
    if (canvasRef.current !== null) delete canvasRef.current.dataset['drawingGesture'];
    setPreview(undefined);
  };

  return (
    <div ref={wrapper} className="drawing-paper-space">
      <canvas
        ref={canvasRef}
        width={scene.width}
        height={scene.height}
        tabIndex={0}
        className="drawing-paper"
        aria-label="Drawing canvas"
        aria-describedby="drawing-keyboard-hint"
        aria-disabled={state.pending !== undefined}
        onPointerDown={(event) => {
          if (
            event.button !== 0 ||
            state.pending !== undefined ||
            state.confirm ||
            state.textAt !== undefined ||
            gesture.current !== undefined
          )
            return;
          event.preventDefault();
          event.currentTarget.focus();
          const at = point(event);

          if (state.tool === 'text') {
            session.commands.addAt(at);
            return;
          }

          if (state.tool === 'select') session.commands.select(hitElement(scene, at));
          gesture.current = beginGesture(state, at);
          setPreview(gesture.current);
          if (gesture.current !== undefined) {
            pointerId.current = event.pointerId;
            event.currentTarget.dataset['drawingGesture'] = 'active';
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          if (gesture.current === undefined || pointerId.current !== event.pointerId) return;
          gesture.current = moveGesture(gesture.current, point(event));
          setPreview(gesture.current);
        }}
        onPointerUp={(event) => {
          const current = gesture.current;

          if (current === undefined || pointerId.current !== event.pointerId) return;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          cancelGesture();
          if (current.invalid) session.report('Stroke limit reached. Draw a shorter stroke.');
          else if (current.kind === 'new') session.commands.add(current.preview);
          else session.commands.replace(current.preview);
        }}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={cancelGesture}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && gesture.current !== undefined) {
            cancelGesture();
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if (drawingKeyboard(session, event.nativeEvent, true)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      />
    </div>
  );
}
