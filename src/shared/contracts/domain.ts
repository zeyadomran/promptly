import { z } from 'zod';

export const idSchema = z.uuid();
export const timestampSchema = z.iso.datetime();
export const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const snippetTextSchema = z
  .string()
  .min(1)
  .max(1_000_000)
  .refine((text) => text.trim().length > 0);
export const tagColorSchema = z.enum([
  'blue',
  'green',
  'red',
  'purple',
  'amber',
  'teal',
  'pink',
  'lime'
]);
export const tagNameSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((name) => name === name.trim().toLowerCase());
export const tagSchema = z.strictObject({
  id: idSchema,
  name: tagNameSchema,
  color: tagColorSchema,
  createdAt: timestampSchema
});
export const tagSummarySchema = tagSchema.extend({ snippetCount: z.number().int().nonnegative() });
export const snippetSchema = z.strictObject({
  id: idSchema,
  text: snippetTextSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  sourceApp: z.string().min(1).max(256).nullable(),
  sourceAppId: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[\p{L}\p{N}._ -]+$/u)
    .nullable(),
  tags: z.array(tagSchema).max(100),
  lastCopiedAt: timestampSchema.nullable(),
  copyCount: z.number().int().nonnegative()
});
export const searchRequestSchema = z.strictObject({
  query: z.string().max(4096),
  tagIds: z.array(idSchema).max(100),
  untagged: z.boolean(),
  sort: z.enum(['newest', 'oldest', 'most-copied', 'recently-copied']),
  offset: z.number().int().nonnegative().max(1_000_000),
  limit: z.number().int().min(1).max(200)
});
export const searchPageSchema = z.strictObject({
  revision: revisionSchema,
  items: z.array(snippetSchema).max(200),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  searchDurationMs: z.number().nonnegative().optional(),
  matches: z
    .record(
      idSchema,
      z
        .array(
          z.strictObject({
            start: z.number().int().nonnegative(),
            end: z.number().int().positive()
          })
        )
        .max(512)
    )
    .optional()
});
export const snippetSnapshotSchema = z.strictObject({
  revision: revisionSchema,
  snippet: snippetSchema
});
export const revisionSnapshotSchema = z.strictObject({ revision: revisionSchema });
export const changeEventSchema = z.strictObject({
  revision: revisionSchema,
  domains: z
    .array(z.enum(['snippets', 'tags', 'settings']))
    .min(1)
    .max(3)
});
export const captureResultSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('empty'), revision: revisionSchema }),
  z.strictObject({
    status: z.enum(['saved', 'duplicate']),
    revision: revisionSchema,
    snippet: snippetSchema
  })
]);

export type Tag = z.infer<typeof tagSchema>;
export type TagSummary = z.infer<typeof tagSummarySchema>;
export type Snippet = z.infer<typeof snippetSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchPage = z.infer<typeof searchPageSchema>;
export type ChangeEvent = z.infer<typeof changeEventSchema>;
export type CaptureResult = z.infer<typeof captureResultSchema>;
