import { z } from 'zod';

import { idSchema, revisionSchema, searchRequestSchema } from './domain';

export const bundleSelectionRequestSchema = searchRequestSchema
  .pick({ query: true, tagIds: true, untagged: true })
  .extend({
    ids: z
      .array(idSchema)
      .max(20)
      .refine((ids) => new Set(ids).size === ids.length)
  });
export const bundleSelectionResponseSchema = z.strictObject({
  revision: revisionSchema,
  ids: z.array(idSchema).max(20)
});
export const bundleSelectionOperations = {
  matchBundleSelection: {
    request: bundleSelectionRequestSchema,
    response: bundleSelectionResponseSchema
  }
} as const;
export type BundleSelectionRequest = z.infer<typeof bundleSelectionRequestSchema>;
export type BundleSelectionResponse = z.infer<typeof bundleSelectionResponseSchema>;
