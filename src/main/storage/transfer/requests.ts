import type { DesktopResult } from '../../../shared/contracts/result';
import { failure } from '../../../shared/contracts/result';

export interface TransferOwner {
  id: number;
  isAlive: () => boolean;
  onClose: (listener: () => void) => () => void;
}
export interface TransferScope {
  owner: TransferOwner;
  signal: AbortSignal;
}

/** Owns request lifetimes independently of uncancelable native dialog completion. */
export class TransferRequests {
  private closing = false;
  private readonly active = new Map<number, AbortController>();
  private readonly pending = new Set<Promise<unknown>>();

  constructor(private readonly findOwner: (id: number) => TransferOwner | undefined) {}

  run<T>(
    context: { senderId: number } | undefined,
    action: (scope: TransferScope) => Promise<DesktopResult<T>>
  ): Promise<DesktopResult<T>> {
    if (this.closing)
      return Promise.resolve(failure('UNAVAILABLE', 'Storage transfer is shutting down.'));
    const owner = context === undefined ? undefined : this.findOwner(context.senderId);

    if (owner?.isAlive() !== true)
      return Promise.resolve(failure('UNAUTHORIZED', 'The originating window is unavailable.'));
    if (this.active.has(owner.id))
      return Promise.resolve(failure('UNAVAILABLE', 'Another storage operation is in progress.'));
    const controller = new AbortController();
    const stop = owner.onClose(() => {
      controller.abort();
    });

    this.active.set(owner.id, controller);
    const result = Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return action({ owner, signal: controller.signal });
      })
      .catch(() =>
        failure(
          'UNAVAILABLE',
          controller.signal.aborted
            ? 'The storage operation was canceled because its window closed.'
            : 'Unable to complete storage transfer. Check the file and available disk space.'
        )
      )
      .finally(() => {
        stop();
        this.active.delete(owner.id);
      });

    return this.observe(result);
  }

  observe<T>(work: Promise<T>): Promise<T> {
    this.pending.add(work);
    void work
      .finally(() => {
        this.pending.delete(work);
      })
      .catch(() => undefined);
    return work;
  }

  async close(): Promise<void> {
    this.closing = true;
    for (const controller of this.active.values()) controller.abort();
    while (this.pending.size > 0) await Promise.allSettled(this.pending);
  }
}

/** Dialogs have no save/open abort API; ignore late paths and observe late rejection. */
export async function awaitOwnedDialog<T>(dialog: Promise<T>, signal: AbortSignal): Promise<T> {
  let stop = () => undefined;
  const canceled = new Promise<never>((_resolve, reject) => {
    const abort = () => {
      reject(new Error('Owned dialog canceled.'));
    };

    if (signal.aborted) abort();
    else {
      signal.addEventListener('abort', abort, { once: true });
      stop = () => {
        signal.removeEventListener('abort', abort);
      };
    }
  });

  try {
    return await Promise.race([dialog, canceled]);
  } finally {
    stop();
  }
}
