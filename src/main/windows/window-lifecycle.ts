import { app, type BrowserWindow, screen, systemPreferences } from 'electron';

import { failure } from '../../shared/contracts/result';
import type { WindowKind, WindowState } from '../../shared/contracts/window';
import { focusSearchChannel } from '../../shared/contracts/window';
import type { WindowRegistry } from '../ipc/window-registry';
import type { SettingsService } from '../settings/service';
import { createMainWindow } from './create-main-window';
import { clampBounds, windowGeometry } from './geometry';
import type { WindowOperations } from './lifecycle-services';
import { canRecover, concealWindow, type WindowRecovery } from './visibility';
import { displayAreas, WindowBounds } from './window-bounds';

export class WindowLifecycle {
  private readonly windows = new Map<WindowKind, BrowserWindow>();
  private readonly opening = new Map<WindowKind, Promise<BrowserWindow>>();
  private bounds: WindowBounds | undefined;
  private closing = false;
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
    for (const [kind, window] of this.windows) {
      if (kind === 'main' || window.isDestroyed()) continue;
      const mode = this.state().mode;
      const target = clampBounds(window.getNormalBounds(), displayAreas(), mode, kind);
      const minimum = windowGeometry(kind, mode);

      window.setMinimumSize(
        Math.min(minimum.minWidth, target.width),
        Math.min(minimum.minHeight, target.height)
      );
      window.setBounds(target);
    }
  };

  async show(kind: WindowKind = 'main'): Promise<BrowserWindow> {
    if (this.closing) throw new Error('Promptly is shutting down.');
    let window = this.windows.get(kind);

    const loading = this.opening.get(kind);

    if (loading !== undefined) window = await loading;

    if (window === undefined || window.isDestroyed()) {
      let pending = this.opening.get(kind);

      if (pending === undefined) {
        pending = createMainWindow(this.registry, this.settings.current, kind, (created) => {
          this.windows.set(kind, created);
          if (kind === 'main')
            this.bounds = new WindowBounds(
              created,
              this.settings,
              this.settings.current.settings.defaultSizeMode,
              this.onError
            );
          created.on('close', (event) => {
            if (this.closing || kind !== 'main') return;
            if (canRecover(this.recovery)) {
              event.preventDefault();
              this.hide();
            } else {
              event.preventDefault();
              app.quit();
            }
          });
          created.on('closed', () => {
            this.windows.delete(kind);
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

    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
    if (kind === 'main') window.webContents.send(focusSearchChannel);
    return window;
  }

  hide(): void {
    const window = this.windows.get('main');

    if (window !== undefined) concealWindow(window, this.recovery);
  }

  async toggle(): Promise<void> {
    const window = this.windows.get('main');

    if (window?.isVisible() === true && !window.isMinimized()) this.hide();
    else await this.show();
  }

  recoverVisibility(): void {
    const window = this.windows.get('main');

    if (window?.isMinimized() === true) window.restore();
    window?.show();
  }

  private state(kind: WindowKind = 'main'): WindowState {
    const window = this.windows.get(kind);

    return {
      kind,
      mode: this.bounds?.mode ?? this.settings.current.settings.defaultSizeMode,
      visible: window?.isVisible() === true && !window.isMinimized()
    };
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

  readonly services: WindowOperations = {
    getWindowState: () => Promise.resolve({ ok: true, value: this.state() }),
    setWindowMode: ({ mode, reducedMotion }) =>
      this.enqueue(async () => {
        await this.show();
        await this.bounds?.switchMode(
          mode,
          reducedMotion || systemPreferences.getAnimationSettings().prefersReducedMotion
        );
        return this.state();
      }),
    setWindowVisibility: ({ visible }) =>
      this.enqueue(async () => {
        if (visible) await this.show();
        else this.hide();
        return this.state();
      }),
    openDesktopWindow: ({ kind }) =>
      this.enqueue(async () => {
        await this.show(kind);
        return this.state(kind);
      }),
    quitApplication: () => {
      app.quit();
      return Promise.resolve({ ok: true, value: {} });
    }
  };

  async close(): Promise<void> {
    this.closing = true;
    screen.removeListener('display-removed', this.reconcile);
    screen.removeListener('display-metrics-changed', this.reconcile);
    await this.commandTail;
    await Promise.allSettled(this.opening.values());
    await this.bounds?.close();
  }
}
