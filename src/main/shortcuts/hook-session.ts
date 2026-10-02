import type { KeyboardHook } from '../platform/keyboard/keyboard-hook';

/** Newer sleep/close wins; native transitions serialize so an old resume cannot retire a new hook. */
export class HookSession {
  hook: KeyboardHook | undefined;
  sleeping = false;
  private generation = 0;
  private closed = false;
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly reset: () => void,
    private readonly restored: () => void
  ) {}

  sleep(): Promise<void> {
    this.generation++;
    this.sleeping = true;
    this.reset();
    return this.enqueue(async () => {
      await this.hook?.stop();
    });
  }

  resume(): Promise<void> {
    if (this.closed) return Promise.resolve();
    const generation = ++this.generation;

    return this.enqueue(async () => {
      if (!this.current(generation)) return;
      await this.hook?.start();
      if (!this.current(generation)) {
        await this.hook?.stop();
        return;
      }

      this.reset();
      this.restored();
      this.sleeping = false;
    });
  }

  close(): Promise<void> {
    this.closed = true;
    this.generation++;
    this.reset();
    return this.enqueue(async () => {
      await this.hook?.stop();
    });
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const result = this.tail.then(action);

    this.tail = result.catch(() => undefined);
    return result;
  }

  private current(generation: number): boolean {
    return !this.closed && generation === this.generation;
  }
}
