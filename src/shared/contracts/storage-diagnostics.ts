import { z } from 'zod';

const storageTimestampSchema = z.strictObject({
  epochMs: z.number().nonnegative(),
  monotonicMs: z.number().nonnegative()
});

/** Content-free opt-in worker metadata; ordinary requests never carry these fields. */
export const workerTimingsSchema = z.strictObject({
  received: storageTimestampSchema,
  sent: storageTimestampSchema
});

export type StorageTimestamp = z.infer<typeof storageTimestampSchema>;
export type WorkerTimings = z.infer<typeof workerTimingsSchema>;
