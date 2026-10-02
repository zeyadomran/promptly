import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';
import type { TransferOwner } from '../storage/transfer/requests';

/** Admission/cancellation only; LibraryMutations remains the sole write serializer. */
export class CopyRequests {
  private closing = false;
  private readonly active = new Map<number, AbortController>();
  private readonly pending = new Set<Promise<unknown>>();

  constructor(private readonly findOwner: (id: number) => TransferOwner | undefined) {}

  run<T>(
    context: { senderId: number } | undefined,
    action: (signal: AbortSignal, owner: TransferOwner) => Promise<DesktopResult<T>>
  ): Promise<DesktopResult<T>> {
    if (this.closing) return Promise.resolve(failure('UNAVAILABLE', 'Copy is shutting down.'));
    const owner = context === undefined ? undefined : this.findOwner(context.senderId);

    if (owner?.isAlive() !== true)
      return Promise.resolve(failure('UNAUTHORIZED', 'The originating window is unavailable.'));
    if (this.active.has(owner.id) || this.active.size >= 16)
      return Promise.resolve(failure('UNAVAILABLE', 'Another copy is in progress.'));
    const controller = new AbortController();
    const stop = owner.onClose(() => {
      controller.abort();
    });

    this.active.set(owner.id, controller);
    const deadline = setTimeout(() => {
      controller.abort();
    }, 30_000);
    const work = Promise.resolve()
      .then(() => action(controller.signal, owner))
      .catch(() => failure('UNAVAILABLE', 'Unable to copy. The clipboard was not confirmed.'))
      .finally(() => {
        clearTimeout(deadline);
        stop();
        this.active.delete(owner.id);
        this.pending.delete(work);
      });

    this.pending.add(work);
    return work;
  }

  async close(): Promise<void> {
    this.closing = true;
    for (const request of this.active.values()) request.abort();
    // An entered clipboard write cannot be canceled; retain and drain its persistence.
    await Promise.allSettled(this.pending);
  }
}
