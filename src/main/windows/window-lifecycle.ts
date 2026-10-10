import { app, type BrowserWindow, screen } from 'electron';

import type { ShellCommand, WindowKind, WindowState } from '../../shared/contracts/window';
import type { WindowRegistry } from '../ipc/window-registry';
import type { SettingsService } from '../settings/service';
import { createMainWindow } from './create-main-window';
import type { PreviousAppCapture } from './previous-app-focus';
import { reconcileWindows } from './reconcile-windows';
import { recoverWindowRenderer, retireWindowRenderer } from './renderer-recovery';
import {
  describeRecovery,
  describeWindow,
  desktopRootKind,
  publishShellCommand,
  publishShellNavigation
} from './shell-navigation';
import type { WindowRecovery } from './visibility';
import { canRecover, concealWindow, restoreWithCapture } from './visibility';
import { watchWindowLifecycle } from './watch-window-lifecycle';
import { WindowBounds } from './window-bounds';
import { WindowCommands } from './window-commands';
import { createWindowOperations } from './window-operations';

export class WindowLifecycle {
  private readonly windows = new Map<WindowKind, BrowserWindow>();
  private readonly opening = new Map<WindowKind, Promise<BrowserWindow>>();
  private readonly ready = new Set<BrowserWindow>();
  private bounds: WindowBounds | undefined;
  private closing = false;
  private readonly isClosing = () => this.closing;
  private readonly commands: WindowCommands;

  constructor(
    private readonly registry: WindowRegistry,
    private readonly settings: SettingsService,
    private readonly recovery: WindowRecovery,
    private readonly onError: (error: unknown) => void,
    private readonly onOpened: () => void = () => undefined,
    private readonly previousApp?: PreviousAppCapture
  ) {
    this.commands = new WindowCommands(this.isClosing, onError);
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
    await this.previousApp?.captureBeforeShow();
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
            previousApp: this.previousApp,
            opened: this.onOpened,
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

  async showWiki(): Promise<void> {
    publishShellNavigation(await this.show('settings', false), 'wiki');
  }

  async dispatchCommand(command: ShellCommand): Promise<void> {
    publishShellCommand(await this.show('settings', false), command);
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
    restoreWithCapture(
      () => this.windows.get(this.rootKind()),
      this.previousApp?.captureBeforeShow.bind(this.previousApp),
      this.isClosing,
      this.onError
    );
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
    return describeWindow(
      this.windows,
      kind,
      this.bounds?.mode ?? this.settings.current.settings.defaultSizeMode,
      this.rootKind()
    );
  }

  readonly services = createWindowOperations({
    state: (kind) => this.state(kind),
    recovery: () => describeRecovery(this.recovery, this.windows.get(this.rootKind())),
    enqueue: (action) => this.commands.enqueue(action),
    show: (kind, navigate) => this.show(kind, navigate),
    hide: this.hide.bind(this),
    switchMode: (mode) => this.bounds?.switchMode(mode) ?? Promise.resolve()
  });

  async close(): Promise<void> {
    this.stopCommands();
    screen.removeListener('display-removed', this.reconcile);
    screen.removeListener('display-metrics-changed', this.reconcile);
    await this.commands.close();
    await Promise.allSettled(this.opening.values());
    await this.bounds?.close();
  }

  stopCommands(): void {
    this.closing = true;
    for (const window of this.windows.values()) retireWindowRenderer(window);
  }
}
