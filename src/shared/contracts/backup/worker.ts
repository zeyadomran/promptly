import { z } from 'zod';

import { revisionSchema } from '../domain';

/** Internal main-to-worker capabilities; these are never exposed by the preload bridge. */
export const exportDataSchema = z.strictObject({
  revision: revisionSchema,
  attachmentsOmitted: z.int().nonnegative().optional()
});
export const importFileSchema = z.strictObject({ filename: z.string().min(1).max(4096) });
export const exportFileSchema = z.strictObject({
  descriptor: z.number().int().nonnegative(),
  format: z.enum(['json', 'markdown'])
});
