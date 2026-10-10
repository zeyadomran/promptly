import type {
  WorkflowCopyOperations,
  WorkflowCopySource
} from '../../../shared/contracts/workflow-copy';
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
  async open(source: WorkflowCopySource, format: 'text' | 'markdown' = 'text'): Promise<void> {
    if (this.state.pending) return;
    this.cancel();
    this.publish({ ...emptyFillState(), active: true, source, format });
    await this.prepare(source, false);
  }
  private async prepare(source: WorkflowCopySource, preserve: boolean): Promise<void> {
    const generation = ++this.generation;
    const oldToken = this.state.prepared?.token;

    if (oldToken !== undefined)
      void this.bridge.cancelPreparedCopy({ token: oldToken }).catch(() => undefined);
    this.publish({ loading: true, pending: false, prepared: null, source, errorCode: undefined });
    try {
      const result = await this.bridge.prepareCopy({ source });

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
  async copy(returnToApp = false, asWritten = false): Promise<boolean> {
    const prepared = this.state.prepared;

    if (prepared === null || this.state.pending || this.state.loading) return false;
    const source =
      this.currentSource === undefined ? (this.state.source ?? undefined) : this.currentSource();

    const sourceState = copySourceState(prepared.source, source);

    if (source === undefined || sourceState === 'missing') {
      this.cancel('Your draft is no longer available.');
      return false;
    }

    if (sourceState === 'changed') {
      this.publish({ error: 'Your draft changed. Check the values again.' });
      await this.prepare(source, true);
      return false;
    }

    if (!asWritten && this.state.unresolved.length > 0) {
      this.publish({
        focusName: this.state.unresolved[0],
        error: 'Fill every value or choose Leave blank.'
      });
      return false;
    }

    if (!asWritten && !this.state.previewValid) return false;
    const generation = this.generation;

    this.publish({ pending: true, error: undefined });
    try {
      const result = await this.bridge.commitCopy({
        token: prepared.token,
        values: this.state.values,
        format: this.state.format,
        mode: asWritten ? 'as-written' : 'resolved',
        return: returnToApp,
        ...(source.kind === 'draft' ? { draftRevision: source.draftRevision } : {})
      });

      if (generation !== this.generation) return false;
      if (!result.ok) {
        this.publish({ pending: false, error: result.error.message, errorCode: result.error.code });
        if (result.error.code === 'CONFLICT' || result.error.code === 'PREPARATION_EXPIRED')
          await this.refreshCurrent(source);
        else if (result.error.code === 'NOT_FOUND') {
          if (source.kind === 'bundle') this.publish({ prepared: null });
          else this.cancel(result.error.message);
        }

        return false;
      }

      this.publish({ ...emptyFillState(), outcome: result.value });
      return true;
    } catch {
      if (generation === this.generation)
        this.publish({ pending: false, error: 'Unable to copy. Your values are kept.' });
      return false;
    }
  }
  cancel(error?: string): void {
    if (this.state.pending) return;
    this.generation += 1;
    const token = this.state.prepared?.token;

    if (token !== undefined) void this.bridge.cancelPreparedCopy({ token }).catch(() => undefined);
    this.publish({ ...emptyFillState(), error });
  }
  private async refreshCurrent(source: WorkflowCopySource): Promise<void> {
    const current = this.currentSource === undefined ? source : this.currentSource();

    if (current === undefined) this.cancel('Your draft is no longer available.');
    else await this.prepare(current, true);
  }
}
