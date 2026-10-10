import { assetLimits, type Attachment } from '../../../shared/contracts/attachments';

export function drawingCapacityReason(attachments: Attachment[], attachmentId?: string) {
  if (
    attachments.length < assetLimits.count ||
    attachments.some((attachment) => attachment.id === attachmentId && attachment.hasScene)
  )
    return undefined;
  return 'Remove an attachment before adding a drawing or annotation. An entry can have up to 8 attachments.';
}
