/** Main commands own a lifetime, never a renderer identity or window to hide. */
export class MainCopyOwner {
  private alive = true;
  private readonly listeners = new Set<() => void>();

  isAlive(): boolean {
    return this.alive;
  }

  onClose(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  close(): void {
    if (!this.alive) return;
    this.alive = false;
    for (const listener of this.listeners) listener();
    this.listeners.clear();
  }
}
