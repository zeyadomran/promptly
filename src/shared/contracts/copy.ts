import { z } from 'zod';

import { idSchema, revisionSchema, timestampSchema } from './domain';

export const copyOutcomeSchema = z.strictObject({
  status: z.literal('copied'),
  id: idSchema,
  statistics: z
    .strictObject({
      revision: revisionSchema,
      copyCount: z.number().int().nonnegative(),
      lastCopiedAt: timestampSchema
    })
    .optional(),
  warnings: z.array(z.literal('STATISTICS_UNCONFIRMED')).max(1)
});

export type CopyOutcome = z.infer<typeof copyOutcomeSchema>;
