import { z } from 'zod';

import { snippetSchema } from './domain';

// Main-owned capture metadata. This schema does not add any renderer capability.
export const captureInputSchema = z.strictObject({
  text: z.string().max(1_000_000),
  sourceApp: snippetSchema.shape.sourceApp,
  sourceAppId: snippetSchema.shape.sourceAppId
});
