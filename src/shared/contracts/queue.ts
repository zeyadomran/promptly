import { z } from 'zod';

import { assetIdSchema, attachmentsSchema } from './attachments';
import { revisionSchema, snippetSnapshotSchema, tagSchema, timestampSchema } from './domain';
import { previewLimits } from './preview-limits';

export const contentTextSchema = z.string().max(1_000_000);
export const contentWriteSchema = z.strictObject({
  text: contentTextSchema,
  tagIds: z.array(assetIdSchema).max(100).optional(),
  draftToken: assetIdSchema.optional()
});
export const queueItemSchema = z.strictObject({
  id: assetIdSchema,
  text: contentTextSchema,
  tags: z.array(tagSchema).max(100),
  attachments: attachmentsSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
  position: z.int().nonnegative().max(2000),
  copyCount: z.int().nonnegative(),
  lastCopiedAt: timestampSchema.nullable()
});
export const queuePreviewSchema = queueItemSchema.extend({
  hasText: z.boolean().optional(),
  text: z.string().max(previewLimits.textUnits)
});
export const queueSnapshotSchema = z.strictObject({
  revision: revisionSchema,
  item: queueItemSchema
});
const id = z.strictObject({ id: assetIdSchema });
const undo = z.strictObject({ undoToken: assetIdSchema });
const revision = z.strictObject({ revision: revisionSchema });

export const queueOperations = {
  listQueue: {
    request: z.strictObject({}),
    response: z.strictObject({
      revision: revisionSchema,
      items: z.array(queuePreviewSchema).max(2000),
      openCount: z.int().nonnegative().max(2000)
    })
  },
  getQueueItem: { request: id, response: queueSnapshotSchema },
  createQueueItem: { request: contentWriteSchema, response: queueSnapshotSchema },
  updateQueueItem: {
    request: contentWriteSchema.extend({ id: assetIdSchema }),
    response: queueSnapshotSchema
  },
  reorderQueueItems: {
    request: z.strictObject({ ids: z.array(assetIdSchema).max(2000) }),
    response: revision
  },
  setQueueItemCompleted: {
    request: id.extend({ completed: z.boolean() }),
    response: queueSnapshotSchema.extend({ undoToken: assetIdSchema })
  },
  undoQueueCompletion: { request: undo, response: queueSnapshotSchema },
  deleteQueueItem: { request: id, response: revision.extend({ undoToken: assetIdSchema }) },
  undoDeleteQueueItem: { request: undo, response: queueSnapshotSchema },
  saveQueueItemToLibrary: { request: id, response: snippetSnapshotSchema },
  addSnippetToQueue: { request: id, response: queueSnapshotSchema }
} as const;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type QueuePreview = z.infer<typeof queuePreviewSchema>;
