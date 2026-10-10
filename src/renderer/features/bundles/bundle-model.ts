import type {
  ContextSeparator,
  PreparedCopy,
  WorkflowCopyOperations
} from '../../../shared/contracts/workflow-copy';
import { workflowLimits } from '../../../shared/contracts/workflow-copy';
import { type BundleState, emptyBundleState } from './bundle-state';

/** Selection reads full content once; checking a row never invokes a copy operation. */
export class BundleModel {
  private state = emptyBundleState();
  private generation = 0;
  private matchingIds: ReadonlySet<string> | undefined;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly bridge: WorkflowCopyOperations) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<BundleState>): void {
    this.state = { ...this.state, ...update };
    this.state.hiddenCount =
      this.matchingIds === undefined
        ? 0
        : this.state.entries.filter((entry) => this.matchingIds?.has(entry.id) !== true).length;
    for (const listener of this.listeners) listener();
  }
  start(): void {
    this.generation += 1;
    this.matchingIds = undefined;
    this.publish({ ...emptyBundleState(), active: true });
  }
  cancel(): void {
    this.generation += 1;
    this.matchingIds = undefined;
    this.publish(emptyBundleState());
  }
  clear(): void {
    this.generation += 1;
    this.publish({ entries: [], pending: false, error: undefined, reviewing: false });
  }
  // These IDs describe selected rows matching the complete filter, not the current page.
  setMatchingIds(ids: ReadonlySet<string>): void {
    this.matchingIds = ids;
    this.publish({});
  }
  async toggle(id: string): Promise<void> {
    if (!this.state.active || this.state.pending || this.state.reviewing) return;
    if (this.state.entries.some((entry) => entry.id === id)) {
      this.remove(id);
      return;
    }

    if (this.state.entries.length >= workflowLimits.sources) {
      this.publish({ error: 'Limit of 20 reached' });
      return;
    }

    const generation = this.generation;

    this.publish({ pending: true, error: undefined });
    try {
      const prepared = await this.bridge.prepareCopy({ source: { kind: 'snippet', id } });

      if (prepared.ok)
        await this.bridge
          .cancelPreparedCopy({ token: prepared.value.token })
          .catch(() => undefined);
      if (generation !== this.generation) return;
      if (!prepared.ok) {
        this.publish({ pending: false, error: prepared.error.message });
        return;
      }

      const segment = prepared.value.segments[0];

      if (segment === undefined) {
        this.publish({ pending: false, error: 'Unable to select this snippet.' });
        return;
      }

      this.publish({
        pending: false,
        entries: [
          ...this.state.entries,
          {
            id,
            label: segment.text.split(/\r?\n/u, 1)[0]?.slice(0, 160) ?? '',
            fingerprint: segment.fingerprint,
            changed: false,
            missing: false
          }
        ]
      });
    } catch {
      if (generation === this.generation)
        this.publish({ pending: false, error: 'Unable to select this snippet.' });
    }
  }
  remove(id: string): void {
    this.publish({ entries: this.state.entries.filter((entry) => entry.id !== id) });
  }
  move(id: string, delta: -1 | 1): void {
    const entries = [...this.state.entries];
    const index = entries.findIndex((candidate) => candidate.id === id);
    const target = index + delta;
    const entry = entries[index];

    if (entry === undefined || target < 0 || target >= entries.length) return;
    entries.splice(index, 1);
    entries.splice(target, 0, entry);
    this.publish({ entries });
  }
  setSeparator(separator: ContextSeparator): void {
    this.publish({ separator });
  }
  source() {
    return {
      kind: 'bundle' as const,
      ids: this.state.entries.map((entry) => entry.id),
      separator: this.state.separator
    };
  }
  review(): boolean {
    if (this.state.pending || this.state.entries.length < 2) return false;
    this.publish({ reviewing: true });
    return true;
  }
  back(): void {
    this.publish({ reviewing: false, error: undefined });
  }
  reconcile(prepared: PreparedCopy): void {
    this.publish({
      entries: this.state.entries.map((entry) => {
        const segment = prepared.segments.find((part) => part.id === entry.id);

        return {
          ...entry,
          label: segment?.text.split(/\r?\n/u, 1)[0]?.slice(0, 160) ?? entry.label,
          missing: segment === undefined,
          changed: segment !== undefined && segment.fingerprint !== entry.fingerprint
        };
      })
    });
  }
  markMissing(id: string): void {
    this.publish({
      entries: this.state.entries.map((entry) =>
        entry.id === id ? { ...entry, missing: true } : entry
      )
    });
  }
  async refreshEntries(): Promise<void> {
    if (this.state.pending) return;
    const generation = this.generation;

    this.publish({ pending: true });
    try {
      for (const entry of this.state.entries) {
        const result = await this.bridge.prepareCopy({ source: { kind: 'snippet', id: entry.id } });

        if (result.ok)
          await this.bridge
            .cancelPreparedCopy({ token: result.value.token })
            .catch(() => undefined);
        if (generation !== this.generation) return;
        const segment = result.ok ? result.value.segments[0] : undefined;

        this.publish({
          entries: this.state.entries.map((current) =>
            current.id === entry.id
              ? {
                  ...current,
                  missing: !result.ok && result.error.code === 'NOT_FOUND',
                  changed: segment !== undefined && segment.fingerprint !== current.fingerprint,
                  label: segment?.text.split(/\r?\n/u, 1)[0]?.slice(0, 160) ?? current.label
                }
              : current
          )
        });
      }
    } catch {
      if (generation === this.generation)
        this.publish({ error: 'Unable to refresh selected snippets.' });
    } finally {
      if (generation === this.generation) this.publish({ pending: false });
    }
  }
  get canCopy(): boolean {
    return (
      this.state.entries.length >= 2 &&
      !this.state.entries.some((entry) => entry.missing) &&
      !this.state.pending
    );
  }
}
