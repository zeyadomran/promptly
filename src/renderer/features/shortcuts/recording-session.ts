import { recordedAccelerator, type ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';

export interface RecordingSnapshot {
  phase: 'idle' | 'starting' | 'recording' | 'saving';
  target: string | undefined;
  error: string | undefined;
  candidate: string | undefined;
}

/** One session per renderer. Serial IPC transitions prevent a late acquire reviving capture. */
export class ShortcutRecordingSession {
  private tail: Promise<void> = Promise.resolve();
  private request = 0;
  private active = false;
  private candidateKey = '';
  private candidateReleased = false;
  private scope: 'global' | 'local' = 'global';
  private commit: ((accelerator: string) => Promise<void>) | undefined;
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
    scope: 'global' | 'local' = 'global'
  ): Promise<void> {
    if (this.snapshot.phase === 'saving') return this.tail;
    const request = ++this.request;

    this.commit = commit;
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
    if (!['starting', 'recording'].includes(this.snapshot.phase)) return false;
    if (
      event.isComposing ||
      ['Dead', 'Process', 'Unidentified', 'AltGraph'].includes(event.key) ||
      event.altGraph === true
    ) {
      this.publish({ ...this.snapshot, candidate: undefined });
      return true;
    }

    if (
      (event.key === 'Escape' && this.scope === 'global') ||
      (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey)
    ) {
      void this.cancel();
      return event.key === 'Escape';
    }

    if (this.snapshot.phase !== 'recording') return true;
    if (
      this.snapshot.candidate !== undefined &&
      !event.repeat &&
      !['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)
    ) {
      this.publish({
        ...this.snapshot,
        candidate: undefined,
        error: 'Record one key with modifiers, then release the keys.'
      });
      return true;
    }

    const accelerator = recordedAccelerator(event, this.scope === 'local');

    if (accelerator === undefined) {
      if (!event.repeat && !['Shift', 'Control', 'Alt', 'Meta'].includes(event.key))
        this.publish({
          ...this.snapshot,
          candidate: undefined,
          error:
            this.scope === 'local'
              ? 'Press one key or a combination. Tab, IME and AltGr text cannot be recorded.'
              : 'Press a modifier and a key. IME and AltGr text cannot be recorded.'
        });
      return true;
    }

    this.candidateKey = event.code || event.key.toLowerCase();
    this.candidateReleased = false;
    this.publish({ ...this.snapshot, candidate: accelerator, error: undefined });
    return true;
  }

  handleKeyUp(event: ShortcutKeyEvent): boolean {
    if (!['starting', 'recording'].includes(this.snapshot.phase)) return false;
    const accelerator = this.snapshot.candidate;

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

    this.publish({ ...this.snapshot, phase: 'saving', error: undefined });
    void this.enqueue(async () => {
      await this.release();
      if (request !== this.request) return;
      await commit?.(accelerator);
      if (request === this.request)
        this.publish({ ...this.snapshot, phase: 'idle', candidate: undefined });
    }, request);
    return true;
  }

  settled(): Promise<void> {
    return this.tail;
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

      if (request === this.request)
        this.publish({
          ...this.snapshot,
          phase: 'idle',
          error:
            error instanceof Error ? error.message : 'Unable to record this shortcut. Try again.'
        });
    });
    return this.tail;
  }

  private publish(snapshot: RecordingSnapshot): void {
    this.snapshot = snapshot;
    this.listener(snapshot);
  }
}
