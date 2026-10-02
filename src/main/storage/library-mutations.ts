import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';

/** Capture must obtain a ticket before native selection starts, then commit through this owner. */
export class LibraryMutations {
  private generation = 0;
  private barrierActive = false;
  private closing = false;
  private tail: Promise<unknown> = Promise.resolve();

  beginCapture(): number | undefined {
    return this.closing || this.barrierActive ? undefined : this.generation;
  }

  commitCapture<T>(ticket: number, action: () => Promise<DesktopResult<T>>) {
    return this.enqueue(action, ticket);
  }

  run<T>(action: () => Promise<DesktopResult<T>>) {
    return this.enqueue(action, this.generation);
  }

  barrier<T>(action: () => Promise<DesktopResult<T>>): Promise<DesktopResult<T>> {
    if (this.closing || this.barrierActive)
      return Promise.resolve(failure('UNAVAILABLE', 'The library is unavailable.'));
    this.generation += 1;
    this.barrierActive = true;
    const result = this.tail.then(action).finally(() => {
      this.barrierActive = false;
    });

    this.tail = result.catch(() => undefined);
    return result;
  }

  close(): Promise<void> {
    this.closing = true;
    return this.tail.then(() => undefined);
  }

  private enqueue<T>(
    action: () => Promise<DesktopResult<T>>,
    generation: number
  ): Promise<DesktopResult<T>> {
    if (this.closing || this.barrierActive)
      return Promise.resolve(failure('UNAVAILABLE', 'The library is unavailable.'));
    const result = this.tail.then(() =>
      generation === this.generation
        ? action()
        : failure('CONFLICT', 'This save was canceled because the library changed.')
    );

    this.tail = result.catch(() => undefined);
    return result;
  }
}
