import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';
import type { TransferOwner } from '../storage/transfer/requests';
import { MainCopyOwner } from './main-owner';

type CopyLifetime = Pick<TransferOwner, 'isAlive' | 'onClose'>;

/** Admission/cancellation only; LibraryMutations remains the sole write serializer. */
export class CopyRequests {
  private closing = false;
  private readonly active = new Map<number | MainCopyOwner, AbortController>();
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
    return this.admit(owner.id, owner, (signal) => action(signal, owner));
  }

  runMain<T>(
    owner: MainCopyOwner,
    action: (signal: AbortSignal) => Promise<DesktopResult<T>>
  ): Promise<DesktopResult<T>> {
    if (!(owner instanceof MainCopyOwner) || !owner.isAlive())
      return Promise.resolve(failure('UNAUTHORIZED', 'The main command is no longer available.'));
    return this.admit(owner, owner, action);
  }

  private admit<T>(
    key: number | MainCopyOwner,
    owner: CopyLifetime,
    action: (signal: AbortSignal) => Promise<DesktopResult<T>>
  ): Promise<DesktopResult<T>> {
    if (this.closing) return Promise.resolve(failure('UNAVAILABLE', 'Copy is shutting down.'));
    if (this.active.has(key) || this.active.size >= 16)
      return Promise.resolve(failure('UNAVAILABLE', 'Another copy is in progress.'));
    const controller = new AbortController();
    const stop = owner.onClose(() => {
      controller.abort();
    });

    this.active.set(key, controller);
    const deadline = setTimeout(() => {
      controller.abort();
    }, 30_000);
    const work = Promise.resolve()
      .then(() => action(controller.signal))
      .catch(() => failure('UNAVAILABLE', 'Unable to copy. The clipboard was not confirmed.'))
      .finally(() => {
        clearTimeout(deadline);
        stop();
        this.active.delete(key);
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
