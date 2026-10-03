import { app, type BrowserWindow, dialog } from 'electron';

interface RendererOwner {
  closing: () => boolean;
  ready: () => boolean;
  reload: () => Promise<BrowserWindow>;
  error: (error: unknown) => void;
}

const recoveries = new WeakMap<BrowserWindow, RendererRecovery>();

/** A slow renderer keeps its window and draft until the user explicitly chooses reload. */
class RendererRecovery {
  private dead = false;
  private unresponsive = false;
  private retired = false;
  private pending: Promise<BrowserWindow> | undefined;
  private decision: AbortController | undefined;

  constructor(
    private readonly window: BrowserWindow,
    private readonly owner: RendererOwner
  ) {
    window.webContents.on('render-process-gone', this.crashed);
    window.on('unresponsive', this.stalled);
    window.on('responsive', this.responsive);
    window.once('closed', this.close);
  }

  private readonly crashed = () => {
    if (!this.owner.ready() || this.owner.closing() || this.retired) return;
    this.dead = true;
    this.unresponsive = false;
    this.decision?.abort();
    void this.recover().catch(this.owner.error);
  };

  private readonly stalled = () => {
    if (!this.owner.ready() || this.owner.closing() || this.retired || this.dead) return;
    this.unresponsive = true;
    void this.recover().catch(this.owner.error);
  };

  private readonly responsive = () => {
    if (this.dead) return;
    this.unresponsive = false;
    this.decision?.abort();
  };

  recover(): Promise<BrowserWindow> {
    if (this.pending !== undefined) return this.pending;
    if ((!this.dead && !this.unresponsive) || this.retired || this.owner.closing())
      return Promise.resolve(this.window);
    this.pending = this.decide()
      .catch((error: unknown) => {
        this.owner.error(error);
        if (!this.retired && !this.owner.closing()) {
          try {
            dialog.showErrorBox(
              'Promptly window recovery',
              'Unable to recover this window. Quit and restart Promptly to reopen saved data. Unsaved edits may be unavailable.'
            );
          } finally {
            app.quit();
          }
        }

        return this.window;
      })
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }

  private async decide(): Promise<BrowserWindow> {
    while (!this.isClosed()) {
      const dead = this.dead;

      this.decision = new AbortController();
      const result = await dialog.showMessageBox(this.window, {
        type: 'warning',
        title: 'Promptly window recovery',
        message: dead ? 'This Promptly window stopped.' : 'This Promptly window is not responding.',
        detail: dead
          ? 'Its unsaved edits are no longer available. Reload to reopen the saved library and preferences. Saved changes will not be replayed.'
          : 'It may recover on its own. Keep waiting to preserve the current window. Reloading will discard unsaved edits. Saved changes will not be replayed.',
        buttons: dead ? ['Reload window', 'Quit'] : ['Keep waiting', 'Reload window', 'Quit'],
        defaultId: 0,
        cancelId: dead ? 1 : 0,
        noLink: true,
        signal: this.decision.signal
      });

      if (this.isClosed()) return this.window;
      if (dead !== this.dead) continue;
      if (!this.dead && !this.unresponsive) return this.window;
      if (result.response === (dead ? 0 : 1)) return this.owner.reload();
      if (result.response === (dead ? 1 : 2)) app.quit();
      return this.window;
    }

    return this.window;
  }

  readonly close = () => {
    this.retired = true;
    this.decision?.abort();
    this.window.webContents.removeListener('render-process-gone', this.crashed);
    this.window.removeListener('unresponsive', this.stalled);
    this.window.removeListener('responsive', this.responsive);
  };

  private isClosed(): boolean {
    return this.retired || this.owner.closing();
  }
}

export function watchRendererRecovery(window: BrowserWindow, owner: RendererOwner): void {
  recoveries.set(window, new RendererRecovery(window, owner));
}

export function recoverWindowRenderer(window: BrowserWindow): Promise<BrowserWindow> {
  return recoveries.get(window)?.recover() ?? Promise.resolve(window);
}

export function retireWindowRenderer(window: BrowserWindow): void {
  recoveries.get(window)?.close();
}
