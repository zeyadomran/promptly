import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import type { AttachmentActions } from './actions';
import type { AttachmentService } from './service';

export function attachmentServices(
  service: AttachmentService,
  actions: AttachmentActions
): Partial<DesktopOperations> {
  return {
    beginDraft: (input, context) => service.begin(input, context),
    discardDraft: (input, context) => service.discard(input, context),
    createSnippet: (input, context) => service.content('createSnippet', input, context),
    updateSnippet: (input, context) => service.content('updateSnippet', input, context),
    createQueueItem: (input, context) => service.content('createQueueItem', input, context),
    updateQueueItem: (input, context) => service.content('updateQueueItem', input, context),
    removeDraftAttachment: (input, context) =>
      service.owns(input.draftToken, context)
        ? service.mutations.run(() =>
            service.owns(input.draftToken, context)
              ? service.storage.call('removeAssetDraft', input)
              : Promise.resolve(failure('UNAUTHORIZED', 'This draft is unavailable.'))
          )
        : Promise.resolve(failure('UNAUTHORIZED', 'This draft is unavailable.')),
    chooseAttachments: async (input, context) => {
      const owner = service.owner(context);

      if (owner === undefined || !service.owns(input.draftToken, context))
        return failure('UNAUTHORIZED', 'This draft is unavailable.');
      try {
        return await service.intake(input.draftToken, await service.effects.choose(owner), context);
      } catch {
        return failure('UNAVAILABLE', 'Unable to attach files. Your draft is kept.');
      }
    },
    addDroppedAttachments: async (input, context) => {
      if (!service.owns(input.draftToken, context) || service.effects.dropped === undefined)
        return failure('UNAUTHORIZED', 'This file draft is unavailable.');
      try {
        return await service.intake(
          input.draftToken,
          await service.effects.dropped(input.paths),
          context
        );
      } catch {
        return failure('UNAVAILABLE', 'Unable to attach dropped files. Your draft is kept.');
      }
    },
    pasteAttachment: async (input, context) => {
      if (!service.owns(input.draftToken, context))
        return failure('UNAUTHORIZED', 'This draft is unavailable.');
      try {
        return await service.intake(input.draftToken, await service.effects.paste(), context);
      } catch {
        return failure('UNAVAILABLE', 'Unable to paste an attachment.');
      }
    },
    getAttachmentThumbnail: (input, context) => actions.raster(input, 160, context),
    getAttachmentImage: (input, context) => actions.raster(input, 2048, context),
    copyAttachmentImage: async (input, context) => {
      const result = await actions.raster(input, 4096, context);

      if (!result.ok) return result;
      if (service.owner(context) === undefined)
        return failure('UNAUTHORIZED', 'The window closed.');
      try {
        await service.effects.copyPng(result.value.png);
        return { ok: true, value: { status: 'copied' } };
      } catch {
        return failure('UNAVAILABLE', 'Unable to copy image.');
      }
    },
    saveAttachmentCopy: async (input, context) => {
      const owner = service.owner(context),
        result = await actions.read(input, context);

      if (!result.ok) return result;
      if (owner === undefined) return failure('UNAUTHORIZED', 'The window closed.');
      try {
        return {
          ok: true,
          value: await service.effects.save(owner, result.value.attachment.name, result.value.bytes)
        };
      } catch {
        return failure('UNAVAILABLE', 'Unable to save the attachment.');
      }
    },
    saveDrawing: (input, context) => actions.drawing(input, context),
    getDrawingScene: async (input, context) => {
      const result = await actions.read(input, context);

      if (!result.ok) return result;
      return result.value.scene === null
        ? failure('NOT_FOUND', 'No editable scene is available.')
        : { ok: true, value: { scene: result.value.scene } };
    },
    copyDrawingPng: (input, context) =>
      actions.pngAction(input, false, context) as ReturnType<DesktopOperations['copyDrawingPng']>,
    exportDrawingPng: (input, context) =>
      actions.pngAction(input, true, context) as ReturnType<DesktopOperations['exportDrawingPng']>
  };
}
