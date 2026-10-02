import { Worker } from 'node:worker_threads';

import type { ChangeEvent } from '../../shared/contracts/domain';
import { changeEventSchema, revisionSnapshotSchema } from '../../shared/contracts/domain';
import type { DesktopResult } from '../../shared/contracts/result';
import { resultSchema } from '../../shared/contracts/result';
import type { StorageOperation, StorageRequest, StorageResponse, WorkerReply } from './protocol';
import { storageOperations } from './protocol';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface DrainWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
}

export class StorageClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private closed = false;
  private failure: Error | undefined;
  private closing: Promise<void> | undefined;
  private draining: DrainWaiter | undefined;
  readonly ready: Promise<number>;

  constructor(
    workerFile: string,
    databaseFile: string,
    onChange: (change: ChangeEvent) => void = () => undefined
  ) {
    this.worker = new Worker(workerFile, { workerData: databaseFile });
    this.ready = this.register(0, 10_000).then((value) => {
      const result = resultSchema(revisionSnapshotSchema).parse(value);

      if (!result.ok) throw new Error(result.error.message);
      return result.value.revision;
    });
    this.worker.on('message', (reply: WorkerReply) => {
      if (reply.change !== undefined) onChange(changeEventSchema.parse(reply.change));
      const request = this.pending.get(reply.id);

      if (request !== undefined) clearTimeout(request.timer);
      request?.resolve(reply.result);
      this.pending.delete(reply.id);
      if (this.pending.size === 0) {
        this.draining?.resolve();
        this.draining = undefined;
      }
    });
    this.worker.on('error', () => {
      this.fail(new Error('Local storage worker failed.'));
    });
    this.worker.on('exit', () => {
      if (!this.closed || this.pending.size > 0)
        this.fail(new Error('Local storage worker stopped.'));
    });
  }

  async call<K extends StorageOperation>(
    name: K,
    input: StorageRequest<K>
  ): Promise<DesktopResult<StorageResponse<K>>> {
    await this.ready;
    if (this.closed) throw new Error('Local storage is closed.');
    if (this.failure !== undefined) throw this.failure;
    const request = storageOperations[name].request.parse(input);
    const response = await this.send(name, request);

    return resultSchema(storageOperations[name].response).parse(response) as DesktopResult<
      StorageResponse<K>
    >;
  }

  close(): Promise<void> {
    if (this.closing !== undefined) return this.closing;
    this.closed = true;
    this.closing = this.shutdown();
    return this.closing;
  }

  private async shutdown(): Promise<void> {
    try {
      await this.ready;
      await this.drain();
      if (this.failure === undefined) await this.send('close', {}, 5000);
    } finally {
      await this.worker.terminate();
    }
  }

  private drain(): Promise<void> {
    if (this.pending.size === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.draining = { resolve, reject };
    });
  }

  private send(
    operation: StorageOperation | 'close',
    input: unknown,
    timeout = 30_000
  ): Promise<unknown> {
    // Control messages do not consume the ordinary request allowance.
    if (operation !== 'close' && this.pending.size >= 1000)
      return Promise.reject(new Error('Local storage queue is full.'));
    const id = this.nextId++;

    const response = this.register(id, timeout);

    this.worker.postMessage({ id, operation, input });
    return response;
  }

  private register(id: number, timeout: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fail(new Error('Local storage worker timed out.'));
      }, timeout);

      this.pending.set(id, { resolve, reject, timer });
    });
  }

  private fail(error: Error): void {
    this.failure = error;
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }

    this.pending.clear();
    this.draining?.reject(error);
    this.draining = undefined;
    void this.worker.terminate();
  }
}
