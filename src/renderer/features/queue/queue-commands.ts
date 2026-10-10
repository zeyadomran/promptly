import type { DesktopResult } from '../../../shared/contracts/result';
import { reorderedQueueIds } from './queue-order';
import type { QueueReader } from './queue-reader';
import type { QueueBridge } from './queue-state';
import type { QueueStore } from './queue-store';

/** Confirmed writes refresh their presentation; failed writes never change the list. */
export class QueueCommands {
  private generation = 0;
  constructor(
    private readonly bridge: QueueBridge,
    private readonly store: QueueStore,
    private readonly reader: QueueReader
  ) {}
  private async run<T>(
    effect: () => Promise<DesktopResult<T>>,
    confirmed: (value: T) => Promise<void> | void
  ): Promise<void> {
    if (!this.store.isActive() || this.store.snapshot().pending || this.store.snapshot().loading)
      return;
    const generation = this.generation;

    this.store.publish({ pending: true, error: undefined });
    try {
      const result = await effect();

      if (!this.store.isActive() || generation !== this.generation) return;
      if (!result.ok) this.store.publish({ error: result.error.message });
      else await confirmed(result.value);
    } catch {
      if (this.store.isActive() && generation === this.generation)
        this.store.publish({
          error: 'The queue action could not be confirmed. Refresh before retrying.'
        });
    } finally {
      if (this.store.isActive() && generation === this.generation)
        this.store.publish({ pending: false });
    }
  }
  complete(id: string): Promise<void> {
    const item = this.store.snapshot().items.find((candidate) => candidate.id === id);

    if (item === undefined) return Promise.resolve();
    const completed = item.completedAt === null;

    return this.run(
      () => this.bridge.setQueueItemCompleted({ id, completed }),
      async (value) => {
        this.store.notify(
          completed
            ? { kind: 'completion', id, undoToken: value.undoToken, message: 'Marked done' }
            : { kind: 'reopened', id }
        );
        await this.reader.load();
      }
    );
  }
  delete(id: string): Promise<void> {
    return this.run(
      () => this.bridge.deleteQueueItem({ id }),
      async (value) => {
        this.store.notify({
          kind: 'delete',
          id,
          undoToken: value.undoToken,
          message: 'Prompt deleted'
        });
        await this.reader.load();
      }
    );
  }
  saveLibrary(id: string): Promise<void> {
    return this.run(
      () => this.bridge.saveQueueItemToLibrary({ id }),
      (value) => {
        this.store.notify({ kind: 'saved', id, snippetId: value.snippet.id });
      }
    );
  }
  reorder(id: string, beforeId: string | undefined): Promise<void> {
    const ids = reorderedQueueIds(this.store.snapshot(), id, beforeId);

    if (ids === undefined) return Promise.resolve();
    return this.run(
      () => this.bridge.reorderQueueItems({ ids }),
      async () => {
        await this.reader.load();
        this.store.publish({
          announcement: `Moved to position ${String(ids.indexOf(id) + 1)} of ${String(ids.length)}`
        });
      }
    );
  }
  move(id: string, delta: -1 | 1): Promise<void> {
    const open = this.store.snapshot().items.filter((item) => item.completedAt === null);
    const index = open.findIndex((item) => item.id === id);

    if (index < 0 || index + delta < 0 || index + delta >= open.length) return Promise.resolve();
    return this.reorder(id, delta === -1 ? open[index - 1]?.id : open[index + 2]?.id);
  }
  undo(): Promise<void> {
    const toast = this.store.snapshot().toast;

    if (toast?.kind !== 'completion' && toast?.kind !== 'delete') return Promise.resolve();
    return this.run(
      () =>
        toast.kind === 'completion'
          ? this.bridge.undoQueueCompletion({ undoToken: toast.undoToken })
          : this.bridge.undoDeleteQueueItem({ undoToken: toast.undoToken }),
      async (value) => {
        this.store.dismiss();
        await this.reader.reveal(value.item.id);
      }
    );
  }
  close(): void {
    this.generation += 1;
  }
}
