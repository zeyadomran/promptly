import { z } from 'zod';

export const updateProgressSchema = z
  .strictObject({
    percent: z.number().min(0).max(100).optional(),
    transferred: z.number().nonnegative().optional(),
    total: z.number().positive().optional()
  })
  .refine(
    ({ transferred, total }) =>
      transferred === undefined || total === undefined || transferred <= total,
    'Transferred bytes must not exceed the total.'
  );
export type UpdateProgress = z.infer<typeof updateProgressSchema>;

export const updateStateSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  status: z.enum([
    'idle',
    'checking',
    'current',
    'available',
    'updating',
    'ready',
    'error',
    'unavailable'
  ]),
  version: z.string().optional(),
  progress: updateProgressSchema.optional(),
  retryOperation: z.enum(['check', 'install', 'restart']).optional(),
  message: z.string(),
  focusRequest: z.number().int().nonnegative()
});
export type UpdateState = z.infer<typeof updateStateSchema>;
export const updateChannel = 'promptly:updates';

const empty = z.strictObject({});

export const updateOperations = {
  getUpdateState: { request: empty, response: updateStateSchema },
  checkForUpdates: { request: empty, response: updateStateSchema },
  installUpdate: { request: empty, response: updateStateSchema },
  restartForUpdate: { request: empty, response: empty }
} as const;
