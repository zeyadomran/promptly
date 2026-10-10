import { z } from 'zod';

export const assetLimits = {
  bytes: 10 * 1024 * 1024,
  totalBytes: 512 * 1024 * 1024,
  count: 8,
  imageEdge: 8192,
  imagePixels: 40_000_000
} as const;
export const assetIdSchema = z.uuid();
export const assetBytesSchema = z
  .instanceof(Uint8Array)
  .refine((bytes) => bytes.byteLength > 0 && bytes.byteLength <= assetLimits.bytes);
export const attachmentSchema = z.strictObject({
  id: assetIdSchema,
  name: z.string().min(1).max(255),
  kind: z.enum(['image', 'file', 'drawing']),
  mimeType: z.string().min(1).max(128),
  byteLength: z.int().positive().max(assetLimits.bytes),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  width: z.int().positive().max(assetLimits.imageEdge).nullable(),
  height: z.int().positive().max(assetLimits.imageEdge).nullable(),
  hasScene: z.boolean()
});
export const attachmentsSchema = z.array(attachmentSchema).max(assetLimits.count);
export const assetOwnerSchema = z.strictObject({
  kind: z.enum(['snippet', 'queue']),
  id: assetIdSchema
});
export const draftRequestSchema = z.strictObject({ draftToken: assetIdSchema });
export const draftSnapshotSchema = z.strictObject({
  token: assetIdSchema,
  attachments: attachmentsSchema
});
export const attachmentRequestSchema = z.strictObject({
  id: assetIdSchema,
  draftToken: assetIdSchema.optional()
});
export const rasterSchema = z.strictObject({
  png: assetBytesSchema,
  width: z.int().positive(),
  height: z.int().positive()
});
const empty = z.strictObject({});

export const attachmentOperations = {
  beginDraft: {
    request: z.strictObject({ source: assetOwnerSchema.optional() }),
    response: draftSnapshotSchema
  },
  discardDraft: { request: draftRequestSchema, response: empty },
  removeDraftAttachment: {
    request: draftRequestSchema.extend({ id: assetIdSchema }),
    response: draftSnapshotSchema
  },
  chooseAttachments: { request: draftRequestSchema, response: draftSnapshotSchema },
  addDroppedAttachments: {
    request: draftRequestSchema.extend({ paths: z.array(z.string().min(1).max(4096)).max(8) }),
    response: draftSnapshotSchema
  },
  pasteAttachment: { request: draftRequestSchema, response: draftSnapshotSchema },
  getAttachmentThumbnail: { request: attachmentRequestSchema, response: rasterSchema },
  getAttachmentImage: { request: attachmentRequestSchema, response: rasterSchema },
  copyAttachmentImage: {
    request: attachmentRequestSchema,
    response: z.strictObject({ status: z.literal('copied') })
  },
  saveAttachmentCopy: {
    request: attachmentRequestSchema,
    response: z.discriminatedUnion('status', [
      z.strictObject({ status: z.literal('cancelled') }),
      z.strictObject({ status: z.literal('saved'), filename: z.string().max(255) })
    ])
  }
} as const;
export type Attachment = z.infer<typeof attachmentSchema>;
export type AssetOwner = z.infer<typeof assetOwnerSchema>;
