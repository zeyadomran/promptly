import { assetLimits } from '../../../shared/contracts/attachments';
import { renderDrawing } from './drawing-render';
import type { DrawingEncoder } from './drawing-types';

export const encodeDrawing: DrawingEncoder = async (scene, background) => {
  const canvas = document.createElement('canvas');

  canvas.width = scene.width;
  canvas.height = scene.height;
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('Canvas is unavailable');
  const bitmap =
    background === undefined
      ? undefined
      : await createImageBitmap(new Blob([new Uint8Array(background.png)]));

  try {
    renderDrawing(context, scene, bitmap);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value === null) reject(new Error('PNG encoding failed'));
        else resolve(value);
      }, 'image/png');
    });

    if (blob.size > assetLimits.bytes) throw new Error('Drawing PNG exceeds 10 MiB.');
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap?.close();
    canvas.width = 1;
    canvas.height = 1;
  }
};
