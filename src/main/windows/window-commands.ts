import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';
import type { WindowState } from '../../shared/contracts/window';

/** One lifecycle command queue covers native and renderer visibility/geometry commands. */
export class WindowCommands {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly closing: () => boolean,
    private readonly onError: (error: unknown) => void
  ) {}

  enqueue(action: () => Promise<WindowState>): Promise<DesktopResult<WindowState>> {
    if (this.closing())
      return Promise.resolve(failure('UNAVAILABLE', 'Promptly is shutting down.'));
    const result = this.tail
      .then(action)
      .then((value) => ({ ok: true as const, value }))
      .catch((error: unknown) => {
        this.onError(error);
        return failure('UNAVAILABLE', 'Unable to change the window. Reopen Promptly to recover.');
      });

    this.tail = result;
    return result;
  }

  async close(): Promise<void> {
    await this.tail;
  }
}
