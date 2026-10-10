import { z } from 'zod';

import { assetIdSchema, attachmentSchema } from '../attachments';
import { drawingSceneSchema } from '../drawing';
import { queueItemSchema } from '../queue';
import { membershipSchema, portableSnippetSchema, portableTagSchema } from './format';

export const workflowHeaderSchema = z.strictObject({
  format: z.literal('promptly-library'),
  version: z.literal(3),
  encoding: z.literal('jsonl')
});
export const workflowHeader = workflowHeaderSchema.parse({
  format: 'promptly-library',
  version: 3,
  encoding: 'jsonl'
});
export const workflowSnippetSchema = portableSnippetSchema.extend({
  text: z.string().max(1_000_000)
});
export const portableQueueSchema = queueItemSchema.omit({ tags: true, attachments: true });
export const workflowAssetSchema = z.strictObject({
  attachment: attachmentSchema,
  scene: drawingSceneSchema.nullable()
});
export const workflowRecordSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('tag'), value: portableTagSchema }),
  z.strictObject({ type: z.literal('snippet'), value: workflowSnippetSchema }),
  z.strictObject({ type: z.literal('membership'), value: membershipSchema }),
  z.strictObject({ type: z.literal('queue'), value: portableQueueSchema }),
  z.strictObject({
    type: z.literal('queueMembership'),
    value: z.strictObject({ itemId: assetIdSchema, tagId: assetIdSchema })
  }),
  z.strictObject({ type: z.literal('asset'), value: workflowAssetSchema }),
  z.strictObject({
    type: z.literal('assetChunk'),
    value: z.strictObject({
      id: assetIdSchema,
      index: z.int().nonnegative().max(160),
      data: z
        .string()
        .min(1)
        .max(87384)
        .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u)
    })
  }),
  z.strictObject({
    type: z.literal('attachment'),
    value: z.strictObject({
      kind: z.enum(['snippet', 'queue']),
      id: assetIdSchema,
      position: z.int().min(0).max(7),
      assetId: assetIdSchema
    })
  })
]);
export const workflowCountsSchema = z.strictObject({
  tags: z.int().nonnegative(),
  snippets: z.int().nonnegative(),
  memberships: z.int().nonnegative(),
  queue: z.int().nonnegative().max(2000),
  queueMemberships: z.int().nonnegative(),
  assets: z.int().nonnegative(),
  assetChunks: z.int().nonnegative(),
  attachments: z.int().nonnegative()
});
export const workflowEndSchema = workflowCountsSchema.extend({
  type: z.literal('end'),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u)
});
export type WorkflowRecord = z.infer<typeof workflowRecordSchema>;
