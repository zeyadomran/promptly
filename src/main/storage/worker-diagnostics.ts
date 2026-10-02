import { z } from 'zod';

const timestampSchema = z.strictObject({
  epochMs: z.number().nonnegative(),
  monotonicMs: z.number().nonnegative()
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

/** Capture only bounded scalar groups. Observers run exclusively at the explicit final flush. */
export class StorageDiagnostics {
  private readonly pending = new Map<number, StorageTimestamp>();
  private readonly groups: StorageBoundary[][] = [];
  private readonly deadline = performance.now() + 10_000;
  private stopped = false;
  private droppedRequests = 0;

  post(requestId: number, timestamp: StorageTimestamp): void {
    if (
      this.stopped ||
      performance.now() > this.deadline ||
      this.pending.size + this.groups.length >= 128
    ) {
      this.droppedRequests += 1;
      return;
    }

    this.pending.set(requestId, timestamp);
  }

  receive(requestId: number, timings: unknown, timestamp: StorageTimestamp): void {
    const posted = this.pending.get(requestId);

    if (posted === undefined) return;
    this.pending.delete(requestId);
    const parsed = workerTimingsSchema.safeParse(timings);

    if (!parsed.success) {
      this.droppedRequests += 1;
      return;
    }

    this.groups.push([
      { requestId, phase: 'main-post', ...posted },
      { requestId, phase: 'worker-receive', ...parsed.data.received },
      { requestId, phase: 'worker-send', ...parsed.data.sent },
      { requestId, phase: 'main-receive', ...timestamp }
    ]);
  }

  flush(observer: StorageBoundaryObserver) {
    this.stopped = true;
    const events = this.groups.flat();
    const receipt = {
      events,
      droppedRequests: this.droppedRequests,
      incompleteRequests: this.pending.size
    };

    this.groups.length = 0;
    this.pending.clear();
    for (const event of events) {
      try {
        observer(event);
      } catch {
        /* Diagnostics cannot alter storage outcomes. */
      }
    }

    return receipt;
  }
}
