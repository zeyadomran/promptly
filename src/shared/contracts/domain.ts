import { z } from 'zod';

import { previewLimits } from './preview-limits';
import { tagPresetColors } from './tag-colors';

export const idSchema = z.uuid();
export const timestampSchema = z.iso.datetime();
export const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const snippetTextSchema = z
  .string()
  .min(1)
  .max(1_000_000)
  .refine((text) => text.trim().length > 0);
export const customTagColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/iu, 'Use a six-digit hex color, such as #12abef.')
  .transform((color) => color.toLowerCase());
export const tagColorSchema = z.union([z.enum(tagPresetColors), customTagColorSchema]);
export const tagNameSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((name) => name === name.trim().toLowerCase())
  .refine((name) => !/[\uD800-\uDFFF]/u.test(name), 'Use well-formed Unicode.');
export const tagInputNameSchema = z
  .string()
  .transform((name) => name.trim().toLowerCase())
  .pipe(tagNameSchema);
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
  limit: z.number().int().min(1).max(200),
  preview: z.enum(['row', 'tray']).optional()
});
// A valid full snippet can start with whitespace, and tray normalization can be empty.
export const snippetPreviewSchema = snippetSchema.extend({
  text: z.string().max(previewLimits.textUnits)
});
export const searchPageSchema = z.strictObject({
  revision: revisionSchema,
  items: z.array(snippetPreviewSchema).max(200),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  matches: z
    .record(
      idSchema,
      z
        .array(
          z.strictObject({
            start: z
              .number()
              .int()
              .nonnegative()
              .max(previewLimits.textUnits - 1),
            end: z.number().int().positive().max(previewLimits.textUnits)
          })
        )
        .max(previewLimits.highlights)
    )
    .refine((matches) => Object.keys(matches).length <= 200)
    .optional()
});
export const snippetSnapshotSchema = z.strictObject({
  revision: revisionSchema,
  snippet: snippetSchema
});
export const revisionSnapshotSchema = z.strictObject({ revision: revisionSchema });
export const copyStatisticsSchema = snippetSchema.pick({
  id: true,
  copyCount: true,
  lastCopiedAt: true
});
export const changeEventSchema = z.strictObject({
  revision: revisionSchema,
  domains: z
    .array(z.enum(['snippets', 'tags', 'settings']))
    .min(1)
    .max(3),
  copyStatistics: copyStatisticsSchema.optional()
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
export type SnippetPreview = z.infer<typeof snippetPreviewSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchPage = z.infer<typeof searchPageSchema>;
export type ChangeEvent = z.infer<typeof changeEventSchema>;
export type CaptureResult = z.infer<typeof captureResultSchema>;
