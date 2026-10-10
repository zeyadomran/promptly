import type { BundleSelectionRequest } from '../../../shared/contracts/bundle-selection';
import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';

export class BundleMatchController {
  private state: { pending: boolean; error: string | undefined; key: string | undefined } = {
    pending: false,
    error: undefined,
    key: undefined
  };
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  constructor(
    private readonly bridge: Pick<DesktopBridge, 'matchBundleSelection'>,
    private readonly matched: (ids: ReadonlySet<string>) => void
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(pending: boolean, error?: string): void {
    this.state = { ...this.state, pending, error };
    for (const listener of this.listeners) listener();
  }
  async refresh(request: BundleSelectionRequest): Promise<void> {
    const generation = ++this.generation;

    this.state = { ...this.state, key: JSON.stringify(request) };
    this.publish(true);
    try {
      const result = await this.bridge.matchBundleSelection(request);

      if (generation !== this.generation) return;
      if (result.ok) {
        this.matched(new Set(result.value.ids));
        this.publish(false);
      } else this.publish(false, result.error.message);
    } catch {
      if (generation === this.generation) this.publish(false, 'Filter matches are unavailable.');
    }
  }
  retire(): void {
    this.generation += 1;
  }
}
