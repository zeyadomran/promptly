import type { WorkflowCopyOutcome } from '../../../shared/contracts/workflow-copy';
import { BundleModel } from '../bundles/bundle-model';
import { FillModel } from '../variables/fill-model';
import { workflowCopyFeedback } from './copy-feedback';
import { routeCopy } from './copy-route';
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
  private feedback = true;
  private handled: WorkflowCopyOutcome | null = null;
  private readonly listeners = new Set<() => void>();
  private unsubscribe: (() => void) | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;
  private targetVersion = 0;
  private requestVersion = 0;
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

    if (options.return === true && this.state.returnLabel === undefined) {
      this.publish({ error: 'No previous app is available to return to.' });
      return;
    }

    const version = this.requestVersion;
    const current = () => !this.closed && version === this.requestVersion;

    this.publish({ busy: true, error: undefined });
    this.input = input;
    this.onCopied = options.onCopied;
    this.feedback = options.feedback !== false;
    try {
      if (!current()) return;
      await routeCopy(this.bridge, this.fill, source, options, {
        current,
        complete: (outcome) => {
          this.complete(outcome);
        },
        review: () => {
          this.publish({ reviewing: true });
        },
        error: (error) => {
          this.publish({ error });
        }
      });
      if (current()) void this.refreshReturnTarget();
    } catch {
      if (current())
        this.publish({
          error: 'Copy could not be confirmed. Check the clipboard before trying again.'
        });
    } finally {
      if (current()) this.publish({ busy: false });
    }
  }
  private complete(outcome: WorkflowCopyOutcome): void {
    const callback = this.onCopied;

    this.onCopied = undefined;
    this.input = undefined;
    clearTimeout(this.timer);
    this.publish({ feedback: this.feedback ? workflowCopyFeedback(outcome) : undefined });
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
  reset(): void {
    this.requestVersion += 1;
    this.input = undefined;
    this.onCopied = undefined;
    clearTimeout(this.timer);
    this.fill.reset();
    this.bundle.cancel();
    this.publish({ busy: false, reviewing: false, error: undefined, feedback: undefined });
  }
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
