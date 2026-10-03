import type { TrayHandle } from './ports';

/** Feedback belongs to one native generation and expires independently of menu refreshes. */
export class TrayFeedback {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly failed: () => void) {}

  show(handle: TrayHandle | undefined, message: string): void {
    this.retire();
    if (handle === undefined || handle.isDestroyed()) return;
    handle.setStatus(message);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (handle.isDestroyed()) return;
      try {
        handle.setStatus('');
      } catch {
        this.failed();
      }
    }, 3000);
  }

  retire(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
