import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';

type CommandBridge = Pick<DesktopBridge, 'copySnippet' | 'deleteSnippet' | 'undoDeleteSnippet'>;
interface CommandState { copiedId: string | null; error: string | undefined }

/** Owns presentation only: accepted clipboard/stat effects are never replayed. */
export class LibraryCommandService {
  private state: CommandState = { copiedId: null, error: undefined };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private busy = false;
  private closed = false;

  constructor(private bridge: CommandBridge, private effects: {
    selectedId: () => string | null;
    refresh: () => void;
    deleted: (undo: () => Promise<void>) => void;
  }) {}

  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  start(): void { this.closed = false; }
  private publish(update: Partial<CommandState>): void {
    if (this.closed) return;
    this.state = { ...this.state, ...update };
    for (const listener of this.listeners) listener();
  }
  report(error: string): void { this.publish({ error }); }

  async copy(id: string, format: 'text' | 'markdown' = 'text'): Promise<void> {
    if (this.closed || this.busy || this.effects.selectedId() !== id) return;
    this.busy = true;
    this.publish({ error: undefined });
    try {
      const result = await this.bridge.copySnippet({ id, format });

      if (!result.ok) { this.report(result.error.message); return; }
      clearTimeout(this.timer);
      this.publish({ copiedId: id, error: result.value.warnings.length > 0
        ? `Copied. ${result.value.warnings.includes('STATISTICS_UNCONFIRMED') ? 'Copy statistics could not be confirmed. ' : ''}${result.value.warnings.includes('WINDOW_NOT_HIDDEN') ? 'The window could not be hidden.' : ''}`.trim()
        : undefined });
      this.timer = setTimeout(() => { this.publish({ copiedId: null }); }, 1500);
      if (result.value.warnings.includes('STATISTICS_UNCONFIRMED')) this.effects.refresh();
    } catch {
      this.report('Copy could not be confirmed. Check the clipboard before trying again.');
    } finally { this.busy = false; }
  }

  async deleteSelected(): Promise<void> {
    const id = this.effects.selectedId();

    if (this.closed || this.busy || id === null) return;
    this.busy = true;
    this.publish({ error: undefined });
    try {
      const result = await this.bridge.deleteSnippet({ id });

      if (!result.ok) { this.report(result.error.message); return; }
      this.effects.deleted(async () => {
        try {
          const restored = await this.bridge.undoDeleteSnippet({ undoToken: result.value.undoToken });

          if (!restored.ok) this.report(restored.error.message);
        } catch { this.report('Unable to restore the snippet.'); }
      });
    } catch { this.report('Unable to delete the snippet.'); }
    finally { this.busy = false; }
  }

  close(): void {
    this.closed = true;
    clearTimeout(this.timer);
  }
}
