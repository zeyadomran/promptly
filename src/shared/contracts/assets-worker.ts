import { z } from 'zod';

import {
  assetBytesSchema,
  assetIdSchema,
  assetOwnerSchema,
  attachmentRequestSchema,
  attachmentSchema,
  draftRequestSchema,
  draftSnapshotSchema
} from './attachments';
import { drawingSceneSchema } from './drawing';

export const assetNameSchema = z
  .string()
  .min(1)
  .max(255)
  .refine(
    (name) =>
      !/[\\/:]/u.test(name) &&
      !Array.from(name).some((character) => character.charCodeAt(0) < 32) &&
      name !== '.' &&
      name !== '..'
  );
export const assetStoreSchema = z.strictObject({
  draftToken: assetIdSchema,
  name: assetNameSchema,
  kind: attachmentSchema.shape.kind,
  mimeType: attachmentSchema.shape.mimeType,
  bytes: assetBytesSchema,
  width: attachmentSchema.shape.width,
  height: attachmentSchema.shape.height,
  scene: drawingSceneSchema.optional(),
  replaceAttachmentId: assetIdSchema.optional()
});
export const assetWorkerOperations = {
  storeDraftAttachments: {
    request: z.strictObject({
      draftToken: assetIdSchema,
      files: z.array(assetStoreSchema.omit({ draftToken: true })).max(8)
    }),
    response: draftSnapshotSchema
  },
  beginAssetDraft: {
    request: z.strictObject({ source: assetOwnerSchema.optional() }),
    response: draftSnapshotSchema
  },
  discardAssetDraft: { request: draftRequestSchema, response: z.strictObject({}) },
  getAssetDraft: { request: draftRequestSchema, response: draftSnapshotSchema },
  removeAssetDraft: {
    request: draftRequestSchema.extend({ id: assetIdSchema }),
    response: draftSnapshotSchema
  },
  storeDraftAttachment: {
    request: assetStoreSchema,
    response: draftSnapshotSchema.extend({ attachment: attachmentSchema })
  },
  readManagedAttachment: {
    request: attachmentRequestSchema,
    response: z.strictObject({
      attachment: attachmentSchema,
      bytes: assetBytesSchema,
      scene: drawingSceneSchema.nullable()
    })
  }
} as const;
