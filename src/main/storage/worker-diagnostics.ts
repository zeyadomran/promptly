import { z } from 'zod';

const timestampSchema = z.strictObject({
  epochMs: z.number().finite().nonnegative(),
  monotonicMs: z.number().finite().nonnegative()
});
const workerTimingsSchema = z.strictObject({
  received: timestampSchema,
  sent: timestampSchema
});

export type StorageTimestamp = z.infer<typeof timestampSchema>;
export type WorkerTimings = z.infer<typeof workerTimingsSchema>;
export interface StorageBoundary {
  requestId: number;
  phase: 'main-post' | 'worker-receive' | 'worker-send' | 'main-receive';
  epochMs: number;
  monotonicMs: number;
}
export type StorageBoundaryObserver = (event: StorageBoundary) => void;

/** Called only for explicitly opted-in diagnostics; never includes request/result contents. */
export function storageTimestamp(): StorageTimestamp {
  const monotonicMs = performance.now();

  return { epochMs: performance.timeOrigin + monotonicMs, monotonicMs };
}

export function emitStorageBoundary(
  observer: StorageBoundaryObserver | undefined,
  requestId: number,
  phase: StorageBoundary['phase'],
  timestamp: StorageTimestamp
): void {
  try {
    observer?.({ requestId, phase, ...timestamp });
  } catch {
    // Optional diagnostic observers must not change storage success/failure behavior.
  }
}

export function receiveWorkerBoundaries(
  observer: StorageBoundaryObserver | undefined,
  requestId: number,
  timings: unknown,
  received: StorageTimestamp
): void {
  const parsed = workerTimingsSchema.safeParse(timings);

  if (parsed.success) {
    emitStorageBoundary(observer, requestId, 'worker-receive', parsed.data.received);
    emitStorageBoundary(observer, requestId, 'worker-send', parsed.data.sent);
  }

  emitStorageBoundary(observer, requestId, 'main-receive', received);
}
