import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import { NdjsonFrames } from './ndjson-frames';
import { admitRequest, type NativePreparation, type PendingRequest } from './request-admission';
import { terminateNative } from './terminate-native';
import { NativeTransportError, type TransportFailure } from './transport-failure';

export { NativeTransportError, type TransportFailure } from './transport-failure';
export interface NativeProcessOptions {
  launch: () => ChildProcessWithoutNullStreams;
}

/** Shared platform pipe: one active request, at most four admitted requests, no text diagnostics. */
export class NativeProcess {
  private child: ChildProcessWithoutNullStreams | undefined;
  private active: PendingRequest | undefined;
  private queue: PendingRequest[] = [];
  private serial = 0;
  private session = 0;
  private disposed = false;
  private disposal: Promise<void> | undefined;

  constructor(private readonly options: NativeProcessOptions) {}

  get running(): boolean {
    return this.child !== undefined;
  }

  get generation(): number {
    return this.session;
  }

  request<T>(
    command: string,
    payload: object,
    parse: (value: unknown) => T,
    deadlineMs: number,
    beforeSend?: NativePreparation
  ): Promise<T> {
    if (this.disposed) return Promise.reject(new NativeTransportError('disposed'));
    if (this.queue.length + (this.active === undefined ? 0 : 1) >= 4)
      return Promise.reject(new NativeTransportError('busy'));
    const id = String(++this.serial);
    const frame = JSON.stringify({ ...payload, v: 1, id, command }) + '\n';

    if (Buffer.byteLength(frame) > 4096) return Promise.reject(new NativeTransportError('busy'));
    return new Promise<T>((resolve, reject) => {
      const pending: PendingRequest = {
        id,
        frame,
        parse,
        beforeSend,
        expiresAt: performance.now() + deadlineMs,
        resolve: (value) => {
          resolve(value as T);
        },
        reject,
        timer: setTimeout(() => {
          if (this.active === pending) this.fail('timedOut');
          else {
            this.queue = this.queue.filter((entry) => entry !== pending);
            reject(new NativeTransportError('timedOut'));
          }
        }, deadlineMs)
      };

      this.queue.push(pending);
      this.pump();
    });
  }

  dispose(): Promise<void> {
    if (this.disposal !== undefined) return this.disposal;
    this.disposed = true;
    const child = this.child;

    this.child = undefined;
    this.fail('disposed');
    this.disposal = terminateNative(child);
    return this.disposal;
  }

  private fail(status: TransportFailure): void {
    const child = this.child;

    this.child = undefined;
    child?.stdin.end();
    child?.kill();
    for (const pending of [this.active, ...this.queue]) {
      if (pending === undefined) continue;
      clearTimeout(pending.timer);
      pending.reject(new NativeTransportError(status));
    }

    this.active = undefined;
    this.queue = [];
  }

  private pump(): void {
    if (this.active !== undefined || this.queue.length === 0 || this.disposed) return;
    this.active = this.queue.shift();
    while (this.active !== undefined && performance.now() >= this.active.expiresAt) {
      clearTimeout(this.active.timer);
      this.active.reject(new NativeTransportError('timedOut'));
      this.active = this.queue.shift();
    }

    if (this.active === undefined) return;
    try {
      const child = this.child ?? this.start();

      if (!admitRequest(this.active, { pid: child.pid, generation: this.session })) {
        this.active = undefined;
        this.pump();
        return;
      }

      child.stdin.write(this.active.frame);
    } catch {
      this.fail('helperUnavailable');
    }
  }

  private start(): ChildProcessWithoutNullStreams {
    const child = this.options.launch();
    const frames = new NdjsonFrames();

    this.child = child;
    this.session++;
    // Drain stderr but never retain or print provider-controlled diagnostics.
    child.stderr.resume();
    child.on('error', () => {
      if (this.child === child) this.fail('helperUnavailable');
    });
    child.stdin.on('error', () => {
      if (this.child === child) this.fail('helperUnavailable');
    });
    child.stdout.on('data', (chunk: Buffer) => {
      if (this.child !== child) return;
      try {
        for (const value of frames.push(chunk)) this.receive(value);
      } catch {
        this.fail('helperUnavailable');
      }
    });
    child.stdout.on('end', () => {
      if (this.child !== child) return;
      try {
        frames.finish();
      } catch {
        /* Partial EOF is a failed helper as well. */
      }

      this.fail('helperUnavailable');
    });
    child.on('exit', () => {
      if (this.child === child) this.fail('helperUnavailable');
    });
    return child;
  }

  private receive(value: unknown): void {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('v' in value) ||
      value.v !== 1 ||
      !('id' in value) ||
      typeof value.id !== 'string' ||
      value.id.length > 128
    ) {
      this.fail('helperUnavailable');
      return;
    }

    const pending = this.active;

    // A retired request or generation can never complete a newer request.
    if (pending?.id !== value.id) return;
    if (performance.now() >= pending.expiresAt) {
      this.fail('timedOut');
      return;
    }

    const result = pending.parse(value);

    if (performance.now() >= pending.expiresAt) {
      this.fail('timedOut');
      return;
    }

    clearTimeout(pending.timer);
    this.active = undefined;
    pending.resolve(result);
    this.pump();
  }
}
