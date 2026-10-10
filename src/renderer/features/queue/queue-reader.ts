import type { QueueBridge } from './queue-state';
import { queueItems } from './queue-state';
import type { QueueStore } from './queue-store';

/** Reads bounded rows and only the selected prompt's exact text. */
export class QueueReader {
  private listVersion = 0;
  private detailVersion = 0;
  private revealVersion = 0;
  private revealTarget: string | undefined;
  private unsubscribe: (() => void) | undefined;
  constructor(
    private readonly bridge: QueueBridge,
    private readonly store: QueueStore
  ) {}
  start(): void {
    if (this.unsubscribe !== undefined) return;
    this.unsubscribe = this.bridge.subscribeChanges((event) => {
      if (!event.domains.includes('queue')) return;
      this.store.publish({ revision: Math.max(this.store.snapshot().revision, event.revision) });
      if (event.cause === 'clear') {
        this.detailVersion += 1;
        this.cancelReveal();
        this.store.dismiss();
        this.store.publish({ detail: null, selectedId: null });
      }

      void this.load();
    });
    void this.load();
  }
  async load(retry = true): Promise<void> {
    const version = ++this.listVersion;
    const state = this.store.snapshot();
    const index = Math.max(
      0,
      queueItems(state).findIndex((item) => item.id === state.selectedId)
    );

    this.store.publish({ loading: true });
    try {
      const result = await this.bridge.listQueue({});

      if (!this.store.active || version !== this.listVersion) return;
      if (!result.ok) {
        this.store.publish({ loading: false, error: result.error.message });
        return;
      }

      if (result.value.revision < this.store.snapshot().revision) {
        if (retry) await this.load(false);
        else this.store.publish({ loading: false, error: 'Queue changed. Refresh it again.' });
        return;
      }

      const latest = this.store.snapshot();
      const visible = queueItems({ ...latest, items: result.value.items });
      const id =
        visible.find((item) => item.id === this.revealTarget)?.id ??
        visible.find((item) => item.id === latest.selectedId)?.id ??
        visible[Math.min(index, visible.length - 1)]?.id ??
        null;

      this.store.publish({ ...result.value, selectedId: id, loading: false, error: undefined });
      if (id === null) this.store.publish({ detail: null, detailLoading: false });
      else if (this.revealTarget === undefined) await this.readDetail(id);
    } catch {
      if (this.store.active && version === this.listVersion)
        this.store.publish({ loading: false, error: 'Unable to refresh queue.' });
    }
  }
  select(id: string): void {
    if (!queueItems(this.store.snapshot()).some((item) => item.id === id)) return;
    this.cancelReveal();
    this.store.publish({ selectedId: id, detail: null });
    void this.readDetail(id);
  }
  tab(tab: 'open' | 'done'): void {
    if (this.store.snapshot().pending) return;
    this.cancelReveal();
    this.detailVersion += 1;
    this.store.publish({ tab, detail: null, selectedId: null });
    const first = queueItems(this.store.snapshot())[0];

    if (first === undefined) this.store.publish({ detailLoading: false });
    else this.select(first.id);
  }
  private async readDetail(id: string, retry = true): Promise<void> {
    const version = ++this.detailVersion;

    this.store.publish({ detailLoading: true });
    try {
      const result = await this.bridge.getQueueItem({ id });

      if (
        !this.store.active ||
        version !== this.detailVersion ||
        this.store.snapshot().selectedId !== id
      )
        return;
      if (!result.ok) {
        this.store.publish({ detail: null, detailLoading: false, error: result.error.message });
        return;
      }

      if (result.value.revision < this.store.snapshot().revision) {
        if (retry) await this.readDetail(id, false);
        else
          this.store.publish({
            detailLoading: false,
            detail: null,
            error: 'Prompt changed. Refresh queue.'
          });
        return;
      }

      this.store.publish({ detail: result.value.item, detailLoading: false });
    } catch {
      if (this.store.active && version === this.detailVersion)
        this.store.publish({
          detail: null,
          detailLoading: false,
          error: 'Unable to read this prompt.'
        });
    }
  }
  async reveal(id: string, retry = true): Promise<void> {
    const version = ++this.revealVersion;

    this.revealTarget = id;
    this.detailVersion += 1;

    try {
      const result = await this.bridge.getQueueItem({ id });

      if (!this.store.active || version !== this.revealVersion) return;
      if (!result.ok) {
        this.revealTarget = undefined;
        this.store.publish({ error: result.error.message });
        return;
      }

      if (result.value.revision < this.store.snapshot().revision) {
        if (retry) await this.reveal(id, false);
        else {
          this.revealTarget = undefined;
          this.store.publish({ error: 'Prompt changed. Refresh queue before showing it.' });
        }

        return;
      }

      this.revealTarget = undefined;
      this.store.publish({
        tab: result.value.item.completedAt === null ? 'open' : 'done',
        selectedId: id,
        detail: result.value.item,
        revealVersion: this.store.snapshot().revealVersion + 1
      });
      await this.load();
    } catch {
      if (this.store.active && version === this.revealVersion) {
        this.revealTarget = undefined;
        this.store.publish({ error: 'Unable to reveal this prompt. Refresh queue.' });
      }
    }
  }
  private cancelReveal(): void {
    this.revealVersion += 1;
    this.revealTarget = undefined;
  }
  close(): void {
    this.cancelReveal();
    this.listVersion += 1;
    this.detailVersion += 1;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
