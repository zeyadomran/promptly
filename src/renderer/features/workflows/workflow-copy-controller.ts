import type { WorkflowCopyOutcome } from '../../../shared/contracts/workflow-copy';
import { BundleModel } from '../bundles/bundle-model';
import { FillModel } from '../variables/fill-model';
import { legacyCopyOutcome, workflowCopyFeedback } from './copy-feedback';
import type {
  WorkflowCopyBridge,
  WorkflowCopyInput,
  WorkflowCopyOptions,
  WorkflowCopyState
} from './workflow-copy-types';

export class WorkflowCopyController {
  readonly fill: FillModel;
  readonly bundle: BundleModel;
  private state: WorkflowCopyState = {
    busy: false,
    reviewing: false,
    error: undefined,
    returnLabel: undefined,
    feedback: undefined
  };
  private input: WorkflowCopyInput | undefined;
  private onCopied: WorkflowCopyOptions['onCopied'];
  private handled: WorkflowCopyOutcome | null = null;
  private readonly listeners = new Set<() => void>();
  private unsubscribe: (() => void) | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;
  private targetVersion = 0;
  constructor(private readonly bridge: WorkflowCopyBridge) {
    this.fill = new FillModel(bridge, () =>
      this.input === undefined
        ? (this.fill.snapshot().source ?? undefined)
        : typeof this.input === 'function'
          ? this.input()
          : this.input
    );
    this.bundle = new BundleModel(bridge);
    this.start();
  }
  start(): void {
    this.closed = false;
    this.unsubscribe ??= this.fill.subscribe(() => {
      const state = this.fill.snapshot();

      if (!state.active) this.publish({ reviewing: false });
      if (state.outcome !== null && state.outcome !== this.handled) {
        this.handled = state.outcome;
        this.complete(state.outcome);
      }
    });
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<WorkflowCopyState>): void {
    if (this.closed) return;
    this.state = { ...this.state, ...update };
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* A view listener cannot change a confirmed result. */
      }
    }
  }
  clearError = (): void => {
    this.publish({ error: undefined });
  };
  private isClosed(): boolean {
    return this.closed;
  }
  async refreshReturnTarget(): Promise<void> {
    const version = ++this.targetVersion;

    try {
      const result = await this.bridge.getPreviousApp({});

      if (version === this.targetVersion)
        this.publish({
          returnLabel:
            result.ok && result.value.state === 'available' ? result.value.label : undefined
        });
    } catch {
      if (version === this.targetVersion) this.publish({ returnLabel: undefined });
    }
  }
  async requestCopy(input: WorkflowCopyInput, options: WorkflowCopyOptions = {}): Promise<void> {
    if (
      this.closed ||
      this.state.busy ||
      this.fill.snapshot().active ||
      this.bundle.snapshot().active
    )
      return;
    const source = typeof input === 'function' ? input() : input;

    if (source === undefined) return;
    if (source.kind === 'bundle') {
      this.publish({ error: 'Select snippets and choose Review bundle.' });
      return;
    }

    this.publish({ busy: true, error: undefined });
    this.input = input;
    this.onCopied = options.onCopied;
    try {
      if (options.return === true) {
        await this.refreshReturnTarget();
        if (this.state.returnLabel === undefined) {
          this.publish({ error: 'No previous app is available to return to.' });
          return;
        }
      }

      const format = options.format ?? 'text';

      if (source.kind === 'snippet' && options.return !== true && options.asWritten !== true) {
        const result = await this.bridge.copySnippet({ id: source.id, format });

        if (this.isClosed()) return;
        if (result.ok) {
          this.complete(legacyCopyOutcome(result.value));
          return;
        }

        if (result.error.code !== 'TEMPLATE_REQUIRES_PREPARATION') {
          this.publish({ error: result.error.message });
          return;
        }
      }

      await this.fill.open(source, format);
      if (this.isClosed()) return;
      const prepared = this.fill.snapshot().prepared;

      if (prepared !== null && (prepared.variables.length === 0 || options.asWritten === true)) {
        await this.fill.copy(options.return === true, options.asWritten === true);
        if (this.fill.snapshot().active) this.publish({ reviewing: true });
      } else this.publish({ reviewing: true });
      void this.refreshReturnTarget();
    } catch {
      this.publish({
        error: 'Copy could not be confirmed. Check the clipboard before trying again.'
      });
    } finally {
      this.publish({ busy: false });
    }
  }
  private complete(outcome: WorkflowCopyOutcome): void {
    const callback = this.onCopied;

    this.onCopied = undefined;
    this.input = undefined;
    clearTimeout(this.timer);
    this.publish({ feedback: workflowCopyFeedback(outcome) });
    this.timer = setTimeout(() => {
      this.publish({ feedback: undefined });
    }, 1500);
    try {
      callback?.(outcome);
    } catch {
      /* Copy is already confirmed. */
    }
  }
  startBundle = (): void => {
    if (this.state.busy || this.fill.snapshot().pending) return;
    this.fill.cancel();
    this.input = undefined;
    this.onCopied = undefined;
    this.bundle.start();
    void this.refreshReturnTarget();
  };
  cancelBundle = (): void => {
    if (this.fill.snapshot().pending) return;
    this.fill.cancel();
    this.bundle.cancel();
  };
  close(): void {
    this.closed = true;
    this.targetVersion += 1;
    clearTimeout(this.timer);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.fill.cancel();
    this.bundle.cancel();
    this.listeners.clear();
  }
}
