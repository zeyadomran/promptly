import type { DrawingScene } from '../../../shared/contracts/drawing';
import type { DesktopError } from '../../../shared/contracts/result';
import type { loadDrawing } from './drawing-open';
import type {
  DrawingBridge,
  DrawingEncoder,
  DrawingOpenOptions,
  DrawingRaster
} from './drawing-types';

class DrawingOutputRefusal extends Error {
  constructor(readonly refusal: DesktopError) {
    super(refusal.message);
  }
}
export function drawingOutputFailure(mode: 'save' | 'copy' | 'export', error: unknown): string {
  if (error instanceof DrawingOutputRefusal)
    return mode === 'save' ? `${error.message} Your drawing is kept.` : error.message;
  return mode === 'save'
    ? 'Could not save the drawing. Your drawing is kept.'
    : mode === 'export'
      ? 'Could not export the PNG.'
      : 'Unable to copy. The clipboard was not confirmed.';
}

export async function drawingOutput(
  mode: 'save' | 'copy' | 'export',
  bridge: DrawingBridge,
  encode: DrawingEncoder,
  scene: DrawingScene,
  background: DrawingRaster | undefined,
  saved: Awaited<ReturnType<typeof loadDrawing>>,
  options: DrawingOpenOptions,
  active: () => boolean
) {
  const png = new Uint8Array(await encode(scene, background));

  if (!active()) throw new Error('Drawing retired');
  if (mode === 'save') {
    const save = await bridge.saveDrawing({
      draftToken: options.draftToken,
      scene,
      png,
      name: saved.name,
      ...(saved.replaceAttachmentId === undefined
        ? {}
        : { replaceAttachmentId: saved.replaceAttachmentId })
    });

    if (!save.ok) throw new DrawingOutputRefusal(save.error);
    return { attachments: save.value.attachments, announcement: 'Drawing saved.' };
  }

  const result =
    mode === 'copy' ? await bridge.copyDrawingPng({ png }) : await bridge.exportDrawingPng({ png });

  if (!result.ok) throw new DrawingOutputRefusal(result.error);
  return {
    attachments: undefined,
    announcement:
      mode === 'copy'
        ? 'PNG copied. Drawing remains unsaved.'
        : result.value.status === 'cancelled'
          ? 'Export cancelled. Drawing is kept.'
          : 'PNG exported. Drawing remains unsaved.'
  };
}
