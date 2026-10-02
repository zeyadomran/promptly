/** P11 installs the capture pipeline here. Triggering never focuses a window or fakes a save. */
export class CaptureTrigger {
  private handler: (() => () => Promise<void>) | undefined;
  private running = false;

  get available(): boolean {
    return this.handler !== undefined;
  }

  install(handler: () => () => Promise<void>): () => void {
    this.handler = handler;
    return () => {
      if (this.handler === handler) this.handler = undefined;
    };
  }

  fire(): void {
    if (this.running || this.handler === undefined) return;
    const work = this.handler();

    this.running = true;
    void Promise.resolve()
      .then(work)
      .catch(() => undefined)
      .finally(() => {
        this.running = false;
      });
  }
}
