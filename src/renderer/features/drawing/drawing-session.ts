import { DrawingCommands } from './drawing-commands';
import { DrawingModel } from './drawing-model';
import { loadDrawing } from './drawing-open';
import { drawingOutput } from './drawing-output';
import { type DrawingState, initialDrawingState } from './drawing-state';
import type { DrawingBridge, DrawingEncoder, DrawingOpenOptions } from './drawing-types';

export class DrawingSession {
  private state = initialDrawingState();
  private model: DrawingModel | undefined;
  private options: DrawingOpenOptions | undefined;
  private saved: Awaited<ReturnType<typeof loadDrawing>> | undefined;
  private generation = 0;
  private closed = false;
  private listeners = new Set<() => void>();
  private isClosed(): boolean {
    return this.closed;
  }
  readonly commands: DrawingCommands;
  constructor(
    readonly bridge: DrawingBridge,
    readonly encode: DrawingEncoder,
    private readonly warning: (message: string) => void = () => undefined
  ) {
    this.commands = new DrawingCommands({
      state: this.snapshot,
      model: () => this.model,
      change: this.edit,
      update: (state) => {
        this.publish(state);
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
  private publish(update: Partial<DrawingState>): void {
    if (this.closed) return;
    this.state = { ...this.state, ...update };
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        this.warn('The drawing view could not refresh.');
      }
    }
  }
  private warn(message: string): void {
    try {
      this.warning(message);
    } catch {
      /* Presentation cannot change a confirmed operation. */
    }
  }
  start(): void {
    this.closed = false;
  }
  close(): void {
    this.retire();
    this.closed = true;
  }
  retire(): void {
    this.generation++;
    this.model = undefined;
    this.options = undefined;
    this.saved = undefined;
    this.publish(initialDrawingState());
  }
  async open(options: DrawingOpenOptions): Promise<void> {
    if (this.closed || this.state.isOpen) return;
    const generation = ++this.generation;

    this.options = options;
    this.publish({
      ...initialDrawingState(),
      isOpen: true,
      pending: 'load',
      saveTarget: options.saveTarget ?? 'prompt'
    });
    try {
      const loaded = await loadDrawing(this.bridge, options);

      if (this.isClosed() || generation !== this.generation) return;
      this.saved = loaded;
      this.model = new DrawingModel(loaded.scene);
      this.publish({ scene: loaded.scene, background: loaded.background, pending: undefined });
    } catch (error) {
      if (generation === this.generation)
        this.publish({
          pending: undefined,
          error: error instanceof Error ? error.message : 'Unable to open drawing.'
        });
    }
  }
  report(error: string): void {
    this.publish({ error });
  }
  private edit = (change: (model: DrawingModel) => void, announcement: string): boolean => {
    if (this.model === undefined || this.state.pending !== undefined || this.state.confirm)
      return false;
    try {
      change(this.model);
      this.publish({
        scene: this.model.scene,
        selectedId: this.model.selectedId,
        dirty: this.model.dirty,
        canUndo: this.model.canUndo,
        canRedo: this.model.canRedo,
        error: undefined,
        announcement
      });
      return true;
    } catch (error) {
      this.report(error instanceof Error ? error.message : 'Unable to change drawing.');
      return false;
    }
  };
  keep(): void {
    this.publish({ confirm: false });
  }
  requestClose(): void {
    if (this.state.pending !== undefined) return;
    if (this.state.textAt !== undefined) this.commands.cancelText();
    else if (this.state.dirty) this.publish({ confirm: true });
    else this.retire();
  }
  discard(): void {
    if (this.state.pending === undefined) this.retire();
  }
  async output(mode: 'save' | 'copy' | 'export'): Promise<boolean> {
    const model = this.model,
      options = this.options,
      saved = this.saved,
      generation = this.generation;
    const active = () => !this.closed && generation === this.generation;

    if (
      model === undefined ||
      options === undefined ||
      saved === undefined ||
      model.scene.elements.length === 0 ||
      this.state.pending !== undefined ||
      this.state.textAt !== undefined
    )
      return false;
    this.publish({ pending: mode, error: undefined });
    let result: Awaited<ReturnType<typeof drawingOutput>>;

    try {
      result = await drawingOutput(
        mode,
        this.bridge,
        this.encode,
        model.scene,
        this.state.background,
        saved,
        options,
        active
      );
    } catch {
      if (active())
        this.publish({
          pending: undefined,
          error:
            mode === 'save'
              ? 'Could not save the drawing. Your drawing is kept.'
              : mode === 'export'
                ? 'Could not export the PNG.'
                : 'Unable to copy. The clipboard was not confirmed.'
        });
      return false;
    }

    if (!active()) return true;
    if (result.attachments !== undefined) {
      this.retire();
      try {
        options.onSaved(result.attachments);
      } catch {
        this.warn('Drawing saved. Reopen the editor to refresh attachments.');
      }
    } else this.publish({ pending: undefined, announcement: result.announcement });
    return true;
  }
}
