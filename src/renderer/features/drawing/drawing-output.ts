import type { DrawingScene } from '../../../shared/contracts/drawing';
import type { loadDrawing } from './drawing-open';
import type {
  DrawingBridge,
  DrawingEncoder,
  DrawingOpenOptions,
  DrawingRaster
} from './drawing-types';

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

    if (!save.ok) throw new Error(save.error.message);
    return { attachments: save.value.attachments, announcement: 'Drawing saved.' };
  }

  const result =
    mode === 'copy' ? await bridge.copyDrawingPng({ png }) : await bridge.exportDrawingPng({ png });

  if (!result.ok) throw new Error(result.error.message);
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
