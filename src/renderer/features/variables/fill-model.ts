import type {
  PreparationMode,
  WorkflowCopyOperations,
  WorkflowCopySource
} from '../../../shared/contracts/workflow-copy';
import { commitFill } from './fill-commit';
import { previewFields } from './fill-preview';
import { copySourceState } from './fill-source';
import { emptyFillState, type FillState } from './fill-state';

/** Owns answers only while a dialog is alive; drafts and saved sources are never mutated. */
export class FillModel {
  private state = emptyFillState();
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  constructor(
    private readonly bridge: WorkflowCopyOperations,
    private readonly currentSource?: () => WorkflowCopySource | undefined
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<FillState>): void {
    this.state = { ...this.state, ...update };
    for (const listener of this.listeners) listener();
  }
  async open(
    source: WorkflowCopySource,
    format: 'text' | 'markdown' = 'text',
    preparationMode: PreparationMode = 'resolved'
  ): Promise<void> {
    if (this.state.pending) return;
    this.cancel();
    this.publish({ ...emptyFillState(), active: true, source, format, preparationMode });
    await this.prepare(source, false);
  }
  private async prepare(source: WorkflowCopySource, preserve: boolean): Promise<void> {
    const generation = ++this.generation;
    const oldToken = this.state.prepared?.token;

    if (oldToken !== undefined)
      void this.bridge.cancelPreparedCopy({ token: oldToken }).catch(() => undefined);
    this.publish({ loading: true, pending: false, prepared: null, source, errorCode: undefined });
    try {
      const result = await this.bridge.prepareCopy({ source, mode: this.state.preparationMode });

      if (generation !== this.generation) {
        if (result.ok)
          void this.bridge.cancelPreparedCopy({ token: result.value.token }).catch(() => undefined);
        return;
      }

      if (!result.ok) {
        this.publish({ loading: false, error: result.error.message, errorCode: result.error.code });
        return;
      }

      const values = Object.fromEntries(
        result.value.variables.flatMap(({ name }) => {
          const previous =
            preserve && Object.hasOwn(this.state.values, name)
              ? this.state.values[name]
              : undefined;

          return previous === undefined ? [] : [[name, previous]];
        })
      );

      this.publish({
        prepared: result.value,
        values,
        loading: false,
        focusName: result.value.variables[0]?.name
      });
      this.updatePreview();
    } catch {
      if (generation === this.generation)
        this.publish({ loading: false, error: 'Unable to prepare this copy.' });
    }
  }
  change(name: string, value: string): void {
    if (
      this.state.pending ||
      this.state.prepared?.variables.some((variable) => variable.name === name) !== true
    )
      return;
    this.publish({
      values: { ...this.state.values, [name]: { value, leaveBlank: false } },
      error: undefined
    });
    this.updatePreview();
  }
  leaveBlank(name: string, enabled: boolean): void {
    if (
      this.state.pending ||
      this.state.prepared?.variables.some((variable) => variable.name === name) !== true
    )
      return;
    this.publish({
      values: { ...this.state.values, [name]: { value: '', leaveBlank: enabled } },
      error: undefined
    });
    this.updatePreview();
  }
  setFormat(format: 'text' | 'markdown'): void {
    if (!this.state.pending) {
      this.publish({ format });
      this.updatePreview();
    }
  }
  async refresh(source: WorkflowCopySource): Promise<void> {
    if (!this.state.pending) await this.prepare(source, true);
  }
  private updatePreview(): void {
    this.publish(previewFields(this.state));
  }
  copy(returnToApp = false, asWritten = false): Promise<boolean> {
    return commitFill(
      this.bridge,
      {
        state: this.snapshot,
        source: () => this.source(),
        generation: () => this.generation,
        publish: (update) => {
          this.publish(update);
        },
        prepare: (source) => this.prepare(source, true),
        cancel: (error) => {
          this.cancel(error);
        }
      },
      returnToApp,
      asWritten
    );
  }
  async copyAsWritten(): Promise<boolean> {
    if (this.state.pending || this.state.loading) return false;
    if (this.state.prepared !== null) return this.copy(false, true);
    const source = this.source();

    if (source === undefined || this.state.source === null) return false;
    const changed = copySourceState(this.state.source, source) !== 'ready';

    this.publish({ preparationMode: 'as-written' });
    await this.prepare(source, false);
    if (changed) {
      this.publish({ error: 'Your draft changed. Check the literal preview, then copy again.' });
      return false;
    }

    return this.copy(false, true);
  }
  private source(): WorkflowCopySource | undefined {
    return this.currentSource === undefined
      ? (this.state.source ?? undefined)
      : this.currentSource();
  }
  cancel(error?: string): void {
    if (this.state.pending) return;
    this.reset(error);
  }
  reset(error?: string): void {
    this.generation += 1;
    const token = this.state.prepared?.token;

    if (token !== undefined) void this.bridge.cancelPreparedCopy({ token }).catch(() => undefined);
    this.publish({ ...emptyFillState(), error });
  }
}
