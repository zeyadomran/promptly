import { drawingSceneSchema } from '../../../shared/contracts/drawing';
import type { DrawingBridge, DrawingOpenOptions, DrawingRaster } from './drawing-types';

export async function loadDrawing(bridge: DrawingBridge, options: DrawingOpenOptions) {
  const attachment = options.attachments.find((item) => item.id === options.attachmentId);
  let scene = drawingSceneSchema.parse({ version: 1, width: 1280, height: 800, elements: [] });
  let background: DrawingRaster | undefined;
  let name = `Drawing ${String(options.attachments.filter((item) => item.kind === 'drawing').length + 1)}.png`;
  let replaceAttachmentId: string | undefined;

  if (options.attachmentId !== undefined) {
    if (attachment === undefined || attachment.kind === 'file')
      throw new Error('This image is no longer available.');
    if (attachment.hasScene) {
      const saved = await bridge.getDrawingScene({
        id: attachment.id,
        draftToken: options.draftToken
      });

      if (!saved.ok) throw new Error(saved.error.message);
      scene = drawingSceneSchema.parse(saved.value.scene);
      replaceAttachmentId = attachment.id;
      name = attachment.name;
    } else {
      name = `${attachment.name.replace(/\.[^.]*$/u, '').slice(0, 235)} (annotated).png`;
      scene = { ...scene, backgroundAttachmentId: attachment.id };
    }

    if (scene.backgroundAttachmentId !== undefined) {
      const raster = await bridge.getAttachmentImage({
        id: scene.backgroundAttachmentId,
        draftToken: options.draftToken,
        purpose: 'drawing'
      });

      if (!raster.ok) throw new Error(raster.error.message);
      background = raster.value;
      if (!attachment.hasScene)
        scene = { ...scene, width: background.width, height: background.height };
    }
  }

  return { scene, background, name, replaceAttachmentId };
}
