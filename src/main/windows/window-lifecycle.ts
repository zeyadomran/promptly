import { app, type BrowserWindow, screen } from 'electron';

import { failure } from '../../shared/contracts/result';
import type { WindowKind, WindowState } from '../../shared/contracts/window';
import type { WindowRegistry } from '../ipc/window-registry';
import type { SettingsService } from '../settings/service';
import { createMainWindow } from './create-main-window';
import { reconcileWindows } from './reconcile-windows';
import { recoverWindowRenderer, retireWindowRenderer } from './renderer-recovery';
import {
  describeRecovery,
  describeWindow,
  desktopRootKind,
  publishShellNavigation
} from './shell-navigation';
import { canRecover, concealWindow, type WindowRecovery } from './visibility';
import { watchWindowLifecycle } from './watch-window-lifecycle';
import { WindowBounds } from './window-bounds';
import { createWindowOperations } from './window-operations';

export class WindowLifecycle {
  private readonly windows = new Map<WindowKind, BrowserWindow>();
  private readonly opening = new Map<WindowKind, Promise<BrowserWindow>>();
  private readonly ready = new Set<BrowserWindow>();
  private bounds: WindowBounds | undefined;
  private closing = false;
  private readonly isClosing = () => this.closing;
  private commandTail: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly registry: WindowRegistry,
    private readonly settings: SettingsService,
    private readonly recovery: WindowRecovery,
    private readonly onError: (error: unknown) => void
  ) {
    screen.on('display-removed', this.reconcile);
    screen.on('display-metrics-changed', this.reconcile);
  }

  private readonly reconcile = () => {
    this.bounds?.reconcile();
    reconcileWindows(this.windows, this.state().mode);
  };

  async show(kind: WindowKind = 'main', navigate = true): Promise<BrowserWindow> {
    const view = kind === 'settings' ? 'settings' : 'library';

    if (kind === 'settings') kind = 'main';
    if (this.isClosing()) throw new Error('Promptly is shutting down.');
    if (kind === 'main' && view !== 'settings') kind = this.rootKind();
    // App-wide runtime accessibility remains enabled through quit; never disable active assistive support.
    if (kind === 'onboarding' && !app.isAccessibilitySupportEnabled())
      app.setAccessibilitySupportEnabled(true);
    let window = this.windows.get(kind);
    const loading = this.opening.get(kind);

    if (loading !== undefined) window = await loading;

    if (window === undefined || window.isDestroyed()) {
      let pending = this.opening.get(kind);

      if (pending === undefined) {
        pending = createMainWindow(this.registry, this.settings.current, kind, (created) => {
          this.windows.set(kind, created);
          if (kind === 'main') this.bounds = new WindowBounds(created, this.settings, this.onError);
          watchWindowLifecycle(created, kind, {
            closing: () => this.closing,
            ready: () => this.ready.has(created),
            error: this.onError,
            reload: async () => {
              this.ready.delete(created);
              if (kind === 'main') await this.bounds?.close().catch(this.onError);
              this.windows.delete(kind);
              try {
                return await this.show(kind);
              } finally {
                created.destroy();
              }
            },
            recovery: this.recovery,
            hide: () => {
              this.hide();
            },
            closed: () => {
              this.ready.delete(created);

              if (this.windows.get(kind) !== created) return;
              this.windows.delete(kind);
            }
          });
        });
        this.opening.set(kind, pending);
      }

      try {
        window = await pending;
      } finally {
        this.opening.delete(kind);
      }
    }

    window = await recoverWindowRenderer(window);
    if (this.isClosing()) throw new Error('Promptly is shutting down.');
    if (window.isDestroyed()) throw new Error('Window closed during renderer recovery.');
    this.ready.add(window);
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
    if (kind === 'main' && navigate) publishShellNavigation(window, view);

    return window;
  }

  hide(): void {
    const window = this.windows.get(this.rootKind());

    if (window !== undefined) concealWindow(window, this.recovery);
  }

  async toggle(): Promise<void> {
    const window = this.windows.get(this.rootKind());

    if (window?.isVisible() === true && !window.isMinimized() && window.isFocused()) this.hide();
    else await this.show();
  }

  recoverVisibility(): void {
    const window = this.windows.get(this.rootKind());

    if (window === undefined || window.isDestroyed())
      throw new Error('Promptly cannot restore its window.');
    if (window.isMinimized()) window.restore();
    window.show();
    if (!window.isVisible()) throw new Error('Promptly could not restore its window.');
  }

  recoverIfUnreachable(): void {
    const window = this.windows.get(this.rootKind());

    if (window?.isVisible() === true || window?.isMinimized() === true) return;
    if (!canRecover(this.recovery)) this.recoverVisibility();
  }

  private rootKind(): WindowKind {
    return desktopRootKind(
      this.settings.current.settings.onboardingComplete,
      this.windows.has('main')
    );
  }

  private state(kind: WindowKind = this.rootKind()): WindowState {
    if (kind === 'settings') kind = 'main';
    if (kind === 'main' && !this.windows.has('main')) kind = this.rootKind();
    return describeWindow(
      this.windows.get(kind),
      kind,
      this.bounds?.mode ?? this.settings.current.settings.defaultSizeMode
    );
  }

  private enqueue(action: () => Promise<WindowState>) {
    if (this.closing) return Promise.resolve(failure('UNAVAILABLE', 'Promptly is shutting down.'));
    const result = this.commandTail
      .then(action)
      .then((value) => ({ ok: true as const, value }))
      .catch((error: unknown) => {
        this.onError(error);
        return failure('UNAVAILABLE', 'Unable to change the window. Reopen Promptly to recover.');
      });

    this.commandTail = result;
    return result;
  }

  readonly services = createWindowOperations({
    state: (kind) => this.state(kind),
    recovery: () => describeRecovery(this.recovery, this.windows.get(this.rootKind())),
    enqueue: (action) => this.enqueue(action),
    show: (kind, navigate) => this.show(kind, navigate),
    hide: () => {
      this.hide();
    },
    switchMode: (mode) => this.bounds?.switchMode(mode) ?? Promise.resolve()
  });

  async close(): Promise<void> {
    this.stopCommands();
    screen.removeListener('display-removed', this.reconcile);
    screen.removeListener('display-metrics-changed', this.reconcile);
    await this.commandTail;
    await Promise.allSettled(this.opening.values());
    await this.bounds?.close();
  }

  stopCommands(): void {
    this.closing = true;
    for (const window of this.windows.values()) retireWindowRenderer(window);
  }
}
