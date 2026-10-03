import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import type { ShortcutEdit } from '../../../shared/shortcuts/shortcut-edit';
import { modifierPreview, recordingInput } from './recording-input';
import { recordingCandidate, recordingError, type RecordingSnapshot } from './recording-state';
export type { RecordingSnapshot } from './recording-state';

/** One session per renderer. Serial IPC transitions prevent a late acquire reviving capture. */
export class ShortcutRecordingSession {
  private tail: Promise<void> = Promise.resolve();
  private request = 0;
  private active = false;
  private candidateKey = '';
  private candidateReleased = false;
  private scope: 'global' | 'local' = 'global';
  private commit: ((accelerator: string) => Promise<void>) | undefined;
  private inspect: ((accelerator: string) => ShortcutEdit) | undefined;
  private listener: (snapshot: RecordingSnapshot) => void = () => undefined;
  snapshot: RecordingSnapshot = {
    phase: 'idle',
    target: undefined,
    error: undefined,
    candidate: undefined
  };

  constructor(private readonly recording: (active: boolean) => Promise<void>) {}

  subscribe(listener: (snapshot: RecordingSnapshot) => void): () => void {
    this.listener = listener;
    listener(this.snapshot);
    return () => {
      this.listener = () => undefined;
    };
  }

  start(
    target: string,
    commit: (accelerator: string) => Promise<void>,
    scope: 'global' | 'local' = 'global',
    inspect?: (accelerator: string) => ShortcutEdit
  ): Promise<void> {
    if (this.snapshot.phase === 'saving') return this.tail;
    const request = ++this.request;

    this.commit = commit;
    this.inspect = inspect;
    this.scope = scope;
    this.publish({ phase: 'starting', target, error: undefined, candidate: undefined });
    return this.enqueue(async () => {
      await this.release();
      if (request !== this.request) return;
      // Mark before awaiting so even a rejected/late acquire gets a matching release.
      this.active = true;
      await this.recording(true);
      if (request !== this.request) await this.release();
      else this.publish({ phase: 'recording', target, error: undefined, candidate: undefined });
    }, request);
  }

  cancel(): Promise<void> {
    const request = ++this.request;

    this.publish({ phase: 'idle', target: undefined, error: undefined, candidate: undefined });
    return this.enqueue(() => this.release(), request);
  }

  handleKey(event: ShortcutKeyEvent): boolean {
    if (this.snapshot.phase === 'conflict') {
      if (event.key === 'Escape' || event.key === 'Tab') void this.cancel();
      return event.key === 'Escape';
    }

    if (!['starting', 'recording'].includes(this.snapshot.phase)) return false;
    const input = recordingInput(event, this.scope, this.snapshot.candidate);

    if (input.kind === 'cancel') {
      void this.cancel();
      return input.consume;
    }

    if (this.snapshot.phase !== 'recording') return true;
    if (input.kind === 'ignore') {
      if (input.preview !== undefined) this.publish({ ...this.snapshot, preview: input.preview });
      return true;
    }

    if (input.kind === 'clear') {
      this.publish({
        ...this.snapshot,
        candidate: undefined,
        collision: undefined,
        preview: undefined,
        ...(input.error !== undefined ? { error: input.error } : {})
      });
      return true;
    }

    const { accelerator } = input;
    const inspection = this.inspect?.(accelerator);

    if (inspection?.kind === 'invalid') {
      this.publish({
        ...this.snapshot,
        candidate: undefined,
        collision: undefined,
        error: inspection.message
      });
      return true;
    }

    this.candidateKey = event.code || event.key.toLowerCase();
    this.candidateReleased = false;
    this.publish(recordingCandidate(this.snapshot, accelerator, inspection));
    return true;
  }

  handleKeyUp(event: ShortcutKeyEvent): boolean {
    if (!['starting', 'recording'].includes(this.snapshot.phase)) return false;
    const accelerator = this.snapshot.candidate;

    if (accelerator === undefined)
      this.publish({ ...this.snapshot, preview: modifierPreview(event) });

    if ((event.code || event.key.toLowerCase()) === this.candidateKey)
      this.candidateReleased = true;
    if (
      accelerator === undefined ||
      !this.candidateReleased ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey
    )
      return true;
    const request = this.request;

    const commit = this.commit;
    const collision = this.snapshot.collision;

    this.publish({ ...this.snapshot, phase: 'saving', error: undefined });
    void this.enqueue(async () => {
      await this.release();
      if (request !== this.request) return;
      if (collision !== undefined) {
        this.publish({ ...this.snapshot, phase: 'conflict', collision });
        return;
      }

      await commit?.(accelerator);
      if (request === this.request)
        this.publish({ ...this.snapshot, phase: 'idle', candidate: undefined });
    }, request);
    return true;
  }

  settled(): Promise<void> {
    return this.tail;
  }
  resolveConflict(commit: () => Promise<void>): Promise<void> {
    if (this.snapshot.phase !== 'conflict') return this.tail;
    const request = this.request;

    this.publish({ ...this.snapshot, phase: 'saving', error: undefined });
    return this.enqueue(async () => {
      await commit();
      if (request === this.request)
        this.publish({
          phase: 'idle',
          target: this.snapshot.target,
          candidate: undefined,
          error: undefined
        });
    }, request);
  }

  private async release(): Promise<void> {
    if (!this.active) return;
    await this.recording(false);
    this.active = false;
  }

  private enqueue(action: () => Promise<void>, request: number): Promise<void> {
    this.tail = this.tail.then(action).catch(async (error: unknown) => {
      try {
        await this.release();
      } catch {
        /* Main still owns renderer crash cleanup. */
      }

      if (request === this.request) this.publish(recordingError(this.snapshot, error));
    });
    return this.tail;
  }

  private publish(snapshot: RecordingSnapshot): void {
    this.snapshot = snapshot;
    this.listener(snapshot);
  }
}
