import type { CaptureToast } from '../../shared/contracts/capture-toast';
import type { CaptureEvent } from '../capture/ports';
import { captureNotification, validToastRectangle } from './capture-notification';
import type { ToastEffects, ToastPreferences, ToastRectangle, ToastWindow } from './ports';

/** One latest capture outcome; its deadline is independent of renderer focus. */
export class CaptureToastService {
  private closed = false;
  private version = 0;
  private current: { toast: CaptureToast; source: ToastRectangle | undefined } | undefined;
  private lastFailure = -Infinity;
  private window: ToastWindow | undefined;
  private opening: Promise<ToastWindow> | undefined;
  private cancelTimer: (() => void) | undefined;
  private readonly abort = new AbortController();

  constructor(
    private readonly effects: ToastEffects,
    private preferences: ToastPreferences
  ) {}

  async capture(event: CaptureEvent): Promise<void> {
    if (this.closed || !this.preferences.enabled) return;
    const notification = captureNotification(event);

    if (notification === undefined) return;
    if (notification.status === 'failed') {
      const now = this.effects.now?.() ?? performance.now();

      if (now - this.lastFailure < 5000) return;
      this.lastFailure = now;
    }

    const version = ++this.version;

    this.current = {
      toast: {
        version,
        status: notification.status,
        preview: notification.preview,
        theme: this.preferences.theme,
        phase: 'visible'
      },
      source: notification.source
    };
    this.cancelTimer?.();
    this.cancelTimer = this.effects.schedule(
      () => {
        this.leave(version);
      },
      notification.status === 'failed' ? 5000 : 2300
    );
    try {
      const window = await this.getWindow();

      if (this.stopped()) {
        window.destroy();
        return;
      }

      if (this.latest(version)) this.present();
    } catch {
      if (this.latest(version)) {
        this.dismiss();
        this.effects.failed();
      }
    }
  }

  private stopped(): boolean {
    return this.closed;
  }

  async activate(version: number): Promise<boolean> {
    if (
      !this.latest(version) ||
      this.current?.toast.phase !== 'visible' ||
      this.window?.alive() !== true ||
      !this.window.visible()
    )
      return false;
    try {
      await this.effects.openPromptly();
      return true;
    } catch {
      this.effects.failed();
      return false;
    }
  }

  private leave(version: number): void {
    if (this.closed || this.current?.toast.version !== version) return;
    this.cancelTimer?.();
    this.current.toast = { ...this.current.toast, phase: 'leaving' };
    try {
      this.present();
      if (this.latest(version))
        this.cancelTimer = this.effects.schedule(() => {
          this.dismiss();
        }, 200);
    } catch {
      this.dismiss();
      this.effects.failed();
    }
  }

  private latest(version: number): boolean {
    return !this.closed && this.current?.toast.version === version;
  }

  private getWindow(): Promise<ToastWindow> {
    if (this.window?.alive() === true) return Promise.resolve(this.window);
    if (this.opening !== undefined) return this.opening;
    const opening = this.effects
      .create(this.abort.signal, (version) => {
        void this.activate(version);
      })
      .then((window) => {
        this.window = window;
        return window;
      })
      .finally(() => {
        if (this.opening === opening) this.opening = undefined;
      });

    this.opening = opening;
    return opening;
  }

  updatePreferences(preferences: ToastPreferences): void {
    const changed = this.preferences.theme !== preferences.theme;

    this.preferences = preferences;
    if (this.closed) return;
    if (!preferences.enabled) {
      this.dismiss();
      return;
    }

    if (changed && this.current !== undefined) {
      this.current.toast = { ...this.current.toast, theme: preferences.theme };
      this.present();
    }
  }

  displayChanged(): void {
    if (!this.closed) this.present();
  }

  async close(): Promise<void> {
    this.closed = true;
    this.abort.abort();
    this.dismiss();
    try {
      const window = this.window ?? (await this.opening);

      window?.destroy();
    } catch {
      // The factory owns destruction when readiness fails or is canceled.
    }

    this.window = undefined;
  }

  private dismiss(): void {
    this.current = undefined;
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    if (this.window?.alive() === true) this.window.hide();
  }

  private present(): void {
    if (this.current === undefined || this.window?.alive() !== true) return;
    const area = this.effects.workArea(this.current.source);

    if (!validToastRectangle(area)) {
      this.dismiss();
      return;
    }

    const margin = Math.min(16, area.width / 4, area.height / 4);
    const width = Math.min(330, area.width - 2 * margin);
    const height = Math.min(
      this.current.toast.status === 'failed' ? 140 : 110,
      area.height - 2 * margin
    );

    this.window.present(this.current.toast, {
      x: Math.round(area.x + area.width - width - margin),
      y: Math.round(area.y + area.height - height - margin),
      width: Math.round(width),
      height: Math.round(height)
    });
  }
}
