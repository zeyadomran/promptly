import { z } from 'zod';

import { revisionSchema } from '../domain';

/** Internal main-to-worker capabilities; these are never exposed by the preload bridge. */
export const exportDataSchema = z.strictObject({
  revision: revisionSchema,
  data: z.instanceof(Uint8Array)
});
export const importFileSchema = z.strictObject({ filename: z.string().min(1).max(4096) });
