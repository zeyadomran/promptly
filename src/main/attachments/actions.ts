import type { OperationRequest } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import { imageHeader, isPng, previewable } from './image-header';
import type { AttachmentService } from './service';

export class AttachmentActions {
  constructor(readonly service: AttachmentService) {}
  async read(input: OperationRequest<'getAttachmentImage'>, context?: { senderId: number }) {
    if (
      this.service.owner(context) === undefined ||
      (input.draftToken !== undefined && !this.service.owns(input.draftToken, context))
    )
      return failure('UNAUTHORIZED', 'This attachment is unavailable.');
    return this.service.storage.call('readManagedAttachment', input);
  }
  async raster(
    input: OperationRequest<'getAttachmentImage'>,
    edge: number,
    context?: { senderId: number }
  ) {
    const result = await this.read(input, context);

    if (!result.ok) return result;
    if (!previewable(imageHeader(result.value.bytes)))
      return failure('UNAVAILABLE', 'This file has no safe image preview.');
    try {
      return { ok: true as const, value: this.service.effects.raster(result.value.bytes, edge) };
    } catch {
      return failure('UNAVAILABLE', 'The image cannot be decoded safely.');
    }
  }
  async drawing(input: OperationRequest<'saveDrawing'>, context?: { senderId: number }) {
    if (!this.service.owns(input.draftToken, context))
      return failure('UNAUTHORIZED', 'This attachment draft is unavailable.');
    const dimensions = imageHeader(input.png);

    if (
      !isPng(input.png) ||
      !previewable(dimensions) ||
      Math.max(dimensions.width, dimensions.height) > 4096 ||
      dimensions.width !== input.scene.width ||
      dimensions.height !== input.scene.height
    )
      return failure('INVALID_REQUEST', 'Drawing PNG dimensions do not match the scene.');
    try {
      this.service.effects.raster(input.png, 4096);
    } catch {
      return failure('INVALID_REQUEST', 'The drawing PNG is damaged.');
    }

    return this.service.mutations.run(() =>
      this.service.owns(input.draftToken, context)
        ? this.service.storage.call('storeDraftAttachment', {
            draftToken: input.draftToken,
            name: input.name ?? 'Drawing.png',
            kind: 'drawing',
            mimeType: 'image/png',
            bytes: input.png,
            width: dimensions.width,
            height: dimensions.height,
            scene: input.scene,
            ...(input.replaceAttachmentId === undefined
              ? {}
              : { replaceAttachmentId: input.replaceAttachmentId })
          })
        : Promise.resolve(failure('UNAUTHORIZED', 'The draft window closed.'))
    );
  }
  async pngAction(
    input: OperationRequest<'copyDrawingPng'>,
    save: boolean,
    context?: { senderId: number }
  ) {
    const owner = this.service.owner(context);

    if (owner === undefined) return failure('UNAUTHORIZED', 'The drawing window is unavailable.');
    let bytes: Uint8Array;

    if ('png' in input) {
      const dimensions = imageHeader(input.png);

      if (
        !isPng(input.png) ||
        !previewable(dimensions) ||
        Math.max(dimensions.width, dimensions.height) > 4096
      )
        return failure('INVALID_REQUEST', 'Drawing PNG dimensions exceed the limit.');
      try {
        bytes = this.service.effects.raster(input.png, 4096).png;
      } catch {
        return failure('INVALID_REQUEST', 'The drawing PNG is damaged.');
      }
    } else {
      const result = await this.raster(input, 4096, context);

      if (!result.ok) return result;
      bytes = result.value.png;
    }

    if (!owner.isAlive()) return failure('UNAUTHORIZED', 'The drawing window closed.');
    try {
      if (save)
        return {
          ok: true as const,
          value: await this.service.effects.save(owner, 'Drawing.png', bytes)
        };
      await this.service.effects.copyPng(bytes);
      return { ok: true as const, value: { status: 'copied' as const } };
    } catch {
      return failure('UNAVAILABLE', save ? 'Unable to save PNG.' : 'Unable to copy image.');
    }
  }
}
