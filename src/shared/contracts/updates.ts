import { z } from 'zod';

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
