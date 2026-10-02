import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import { normalizeSnippet } from '../../shared/domain/normalize-snippet';
import type { StorageClient } from '../storage/client';
import type { LibraryMutations } from '../storage/library-mutations';
import type { CaptureEffects, CaptureEvent, CapturePhases, CaptureReply } from './ports';

export class CaptureService {
  private closing = false;
  private active: Promise<CaptureReply> | undefined;
  private readonly listeners = new Set<(event: CaptureEvent) => void>();

  constructor(
    private readonly storage: Pick<StorageClient, 'call'>,
    private readonly mutations: LibraryMutations,
    private readonly effects: CaptureEffects
  ) {}

  readonly services: Pick<DesktopOperations, 'captureSelection'> = {
    captureSelection: () => this.capture()
  };

  subscribe(listener: (event: CaptureEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  capture(): Promise<CaptureReply> {
    return this.prepareCapture()();
  }

  /** Snapshot lightweight admission before a native callback defers its heavy work. */
  prepareCapture(): () => Promise<CaptureReply> {
    const triggeredAt = this.now();
    const admitted = this.effects.admit();
    const ticket = this.mutations.beginCapture();
    const normalize = this.effects.normalize();

    return () => this.start(admitted, ticket, normalize, triggeredAt);
  }

  private start(
    admitted: (() => boolean) | undefined,
    ticket: number | undefined,
    normalize: boolean,
    triggeredAt: number
  ): Promise<CaptureReply> {
    const native = this.effects.native;

    if (this.closing || this.active !== undefined || admitted === undefined || ticket === undefined)
      return Promise.resolve(failure('UNAVAILABLE', 'Capture is paused, busy or shutting down.'));
    if (native === undefined)
      return Promise.resolve(
        failure('UNAVAILABLE', 'Native capture is unavailable. No snippet was saved.')
      );
    const phases: CapturePhases = { triggeredAt };
    const current = () => !this.closing && admitted();

    this.active = this.run(native, ticket, normalize, current, phases)
      .catch(() =>
        failure('INTERNAL', 'Capture could not be confirmed. Do not assume it was saved.')
      )
      .then((result) => {
        this.publish(result, phases);
        return result;
      })
      .finally(() => {
        this.active = undefined;
      });
    return this.active;
  }

  async close(): Promise<void> {
    this.closing = true;
    await this.active;
    this.listeners.clear();
  }

  private async run(
    native: NonNullable<CaptureEffects['native']>,
    ticket: number,
    normalize: boolean,
    current: () => boolean,
    phases: CapturePhases
  ): Promise<CaptureReply> {
    if (!current()) return failure('CONFLICT', 'This capture was canceled.');
    const foreground = await native.foregroundIdentityResult();

    if (!current()) return failure('CONFLICT', 'This capture was canceled.');
    if (foreground.status !== 'ok') return this.nativeFailure(foreground.status);
    if (foreground.identity.bounds != null) phases.sourceBounds = foreground.identity.bounds;
    if (foreground.identity.windowHandle !== undefined)
      phases.sourceWindowHandle = foreground.identity.windowHandle;
    const selected = await native.captureSelection(foreground.identity);

    phases.selectedAt = this.now();
    if (!current()) return failure('CONFLICT', 'This capture was canceled.');
    if (selected.status !== 'ok')
      return selected.status === 'empty' ? this.empty() : this.nativeFailure(selected.status);
    if (selected.identity !== foreground.identity.token)
      return this.nativeFailure('foregroundChanged');
    if (selected.targetIntegrityLevel === null) return this.nativeFailure('permissionDenied');
    if (selected.text.length > 1_000_000) return this.nativeFailure('selectionTooLarge');
    const text = normalizeSnippet(selected.text, normalize);

    if (text.trim().length === 0) return this.empty();
    return this.mutations.commitCapture(ticket, async () => {
      if (!current()) return failure('CONFLICT', 'This capture was canceled.');
      const source = foreground.identity.source;
      const result = await this.storage.call('captureSnippet', {
        text,
        sourceApp: source?.name ?? null,
        sourceAppId: source?.id ?? null
      });

      // An entered transaction drains even after pause/close. Never report it as canceled.
      if (result.ok) {
        phases.persistedAt = this.now();
        if (result.value.status !== 'empty') {
          try {
            this.effects.remember?.(result.value.snippet.id, foreground.identity);
          } catch {
            /* A lost source association does not undo durable success. */
          }
        }
      }

      return result;
    });
  }

  private async empty(): Promise<CaptureReply> {
    const revision = await this.storage.call('getRevision', {});

    return revision.ok
      ? { ok: true, value: { status: 'empty', revision: revision.value.revision } }
      : revision;
  }

  private nativeFailure(status: string): CaptureReply {
    return failure(
      'UNAVAILABLE',
      status === 'unsupported'
        ? 'This app does not support native selection capture. No snippet was saved.'
        : `Native capture was not saved (${status}).`
    );
  }

  private now(): number {
    return this.effects.now?.() ?? performance.now();
  }

  private publish(result: CaptureReply, phases: CapturePhases): void {
    const event: CaptureEvent = {
      ...phases,
      completedAt: this.now(),
      status: result.ok ? result.value.status : 'failed',
      ...(result.ok ? { revision: result.value.revision } : { reason: result.error.code }),
      ...(result.ok && result.value.status !== 'empty'
        ? {
            id: result.value.snippet.id,
            preview: Object.freeze({
              id: result.value.snippet.id,
              text: result.value.snippet.text,
              sourceApp: result.value.snippet.sourceApp,
              sourceAppId: result.value.snippet.sourceAppId
            })
          }
        : {})
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /* Observers cannot change a committed outcome. */
      }
    }
  }
}
