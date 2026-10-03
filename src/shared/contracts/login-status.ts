import { z } from 'zod';

export const loginStatusSchema = z.strictObject({
  requested: z.boolean(),
  registered: z.boolean(),
  enabled: z.boolean(),
  available: z.boolean()
});
export type LoginStatus = z.infer<typeof loginStatusSchema>;
