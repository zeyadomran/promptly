import { z } from 'zod';

export const previousAppSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('none') }),
  z.strictObject({ state: z.literal('available'), label: z.string().min(1).max(64) })
]);
export const returnOutcomeSchema = z.strictObject({
  returned: z.enum(['returned', 'unavailable', 'denied']),
  label: z.string().min(1).max(64).optional()
});
export type PreviousApp = z.infer<typeof previousAppSchema>;
export type ReturnOutcome = z.infer<typeof returnOutcomeSchema>;
export const previousAppOperations = {
  getPreviousApp: { request: z.strictObject({}), response: previousAppSchema },
  returnToPreviousApp: { request: z.strictObject({}), response: returnOutcomeSchema }
} as const;
