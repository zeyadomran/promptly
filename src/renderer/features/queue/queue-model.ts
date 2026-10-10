import type { WorkflowCopyOutcome } from '../../../shared/contracts/workflow-copy';
import { QueueCommands } from './queue-commands';
import { QueueReader } from './queue-reader';
import type { QueueBridge } from './queue-state';
import { QueueStore } from './queue-store';

export class QueueModel {
  private readonly store = new QueueStore();
  private readonly reader: QueueReader;
  private readonly commands: QueueCommands;
  constructor(bridge: QueueBridge) {
    this.reader = new QueueReader(bridge, this.store);
    this.commands = new QueueCommands(bridge, this.store, this.reader);
  }
  snapshot = this.store.snapshot;
  subscribe = this.store.subscribe;
  start(): void {
    this.store.active = true;
    this.reader.start();
  }
  select(id: string): void {
    this.reader.select(id);
  }
  tab(tab: 'open' | 'done'): void {
    this.reader.tab(tab);
  }
  refresh(): void {
    void this.reader.load();
  }
  reveal(id: string): Promise<void> {
    return this.reader.reveal(id);
  }
  complete(id: string): Promise<void> {
    return this.commands.complete(id);
  }
  delete(id: string): Promise<void> {
    return this.commands.delete(id);
  }
  saveLibrary(id: string): Promise<void> {
    return this.commands.saveLibrary(id);
  }
  move(id: string, delta: -1 | 1): Promise<void> {
    return this.commands.move(id, delta);
  }
  reorder(id: string, beforeId: string | undefined): Promise<void> {
    return this.commands.reorder(id, beforeId);
  }
  undo(): Promise<void> {
    return this.commands.undo();
  }
  dismiss(): void {
    this.store.dismiss();
  }
  report(error: string): void {
    this.store.publish({ error });
  }
  copied(id: string, outcome: WorkflowCopyOutcome): void {
    this.store.notify({ kind: 'copied', id, outcome });
  }
  close(): void {
    this.reader.close();
    this.commands.close();
    this.store.stop();
  }
}
