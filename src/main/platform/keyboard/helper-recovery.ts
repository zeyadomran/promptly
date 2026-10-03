export type HookSchedule = (callback: () => void, delayMs: number) => () => void;

export const scheduleHook: HookSchedule = (callback, delayMs) => {
  const timer = setTimeout(callback, delayMs);

  return () => {
    clearTimeout(timer);
  };
};

/** One retry at a time, at most five until a helper survives thirty seconds. */
export class HelperRecovery {
  active = false;
  private attempts = 0;
  private cancelRetry: (() => void) | undefined;
  private cancelStable: (() => void) | undefined;

  constructor(
    private readonly restart: () => void,
    private readonly schedule: HookSchedule
  ) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    this.attempts = 0;
  }

  failed(): void {
    this.cancelStable?.();
    this.cancelStable = undefined;
    if (!this.active || this.cancelRetry !== undefined || this.attempts >= 5) return;
    const delayMs = 250 * 2 ** this.attempts++;

    this.cancelRetry = this.schedule(() => {
      this.cancelRetry = undefined;
      if (this.active) this.restart();
    }, delayMs);
  }

  healthy(): void {
    this.cancelStable?.();
    this.cancelStable = this.schedule(() => {
      this.cancelStable = undefined;
      this.attempts = 0;
    }, 30_000);
  }

  stop(): void {
    this.active = false;
    this.cancelRetry?.();
    this.cancelStable?.();
    this.cancelRetry = undefined;
    this.cancelStable = undefined;
  }
}
