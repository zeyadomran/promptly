import { z } from 'zod';

import { idSchema, revisionSchema } from '../domain';

export const importPreviewSchema = z.strictObject({
  token: idSchema,
  revision: revisionSchema,
  snippets: z.number().int().nonnegative(),
  tags: z.number().int().nonnegative(),
  memberships: z.number().int().nonnegative(),
  remappedSnippetIds: z.number().int().nonnegative(),
  remappedTagIds: z.number().int().nonnegative(),
  coalescedTags: z.number().int().nonnegative()
});
export type ImportPreview = z.infer<typeof importPreviewSchema>;
const empty = z.strictObject({});
const cancelled = z.strictObject({ status: z.literal('cancelled') });

export const transferOperations = {
  getStorageLocation: {
    request: empty,
    response: z.strictObject({ directory: z.string().min(1).max(4096) })
  },
  revealStorageLocation: { request: empty, response: empty },
  exportLibrary: {
    request: z.strictObject({ format: z.enum(['json', 'markdown']) }),
    response: z.discriminatedUnion('status', [
      cancelled,
      z.strictObject({
        status: z.literal('exported'),
        revision: revisionSchema,
        filename: z.string().min(1).max(4096)
      })
    ])
  },
  previewLibraryImport: {
    request: empty,
    response: z.discriminatedUnion('status', [
      cancelled,
      z.strictObject({
        status: z.literal('preview'),
        preview: importPreviewSchema
      })
    ])
  },
  confirmLibraryImport: {
    request: z.strictObject({ token: idSchema, revision: revisionSchema }),
    response: z.strictObject({ revision: revisionSchema })
  },
  cancelLibraryImport: { request: z.strictObject({ token: idSchema }), response: empty },
  clearLibrary: {
    request: z.strictObject({ confirmation: z.literal('CLEAR ALL') }),
    response: z.strictObject({ revision: revisionSchema })
  }
} as const;
