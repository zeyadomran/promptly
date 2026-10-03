import { z } from 'zod';

export const shortcutTestSchema = z.strictObject({
  status: z.enum(['inactive', 'waiting', 'tap', 'detected', 'unavailable']),
  elapsedMs: z.number().nonnegative().optional()
});
export type ShortcutTestState = z.infer<typeof shortcutTestSchema>;
