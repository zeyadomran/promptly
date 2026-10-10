import { initialQueueState, type QueueState, type QueueToast } from './queue-state';

export class QueueStore {
  private state = initialQueueState();
  private readonly listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  active = false;
  snapshot = () => this.state;
  isActive(): boolean {
    return this.active;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  publish(update: Partial<QueueState>): void {
    if (!this.active) return;
    this.state = { ...this.state, ...update };
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* Presentation listeners cannot change a confirmed write. */
      }
    }
  }
  notify(toast: QueueToast): void {
    clearTimeout(this.timer);
    this.publish({ toast });
    this.timer = setTimeout(() => {
      this.dismiss();
    }, 5000);
  }
  dismiss(): void {
    clearTimeout(this.timer);
    this.publish({ toast: undefined });
  }
  stop(): void {
    clearTimeout(this.timer);
    this.state = { ...this.state, toast: undefined };
    this.active = false;
  }
}
