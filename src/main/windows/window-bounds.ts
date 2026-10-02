import { type BrowserWindow, screen } from 'electron';

import type { SizeMode } from '../../shared/contracts/window';
import type { SettingsService } from '../settings/service';
import { clampBounds, modeGeometry, type Rectangle } from './geometry';
import { restoreNormalWindow } from './normal-window';

export function displayAreas() {
  const primary = screen.getPrimaryDisplay();

  return [primary, ...screen.getAllDisplays().filter((display) => display.id !== primary.id)].map(
    (display) => display.workArea
  );
}

/** Owns stable normal geometry; maximize/fullscreen and animation frames never become preferences. */
export class WindowBounds {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private animation: ReturnType<typeof setInterval> | undefined;
  private destination: Rectangle | undefined;
  private tail: Promise<void> = Promise.resolve();
  private stopped = false;
  private saveError: Error | undefined;

  constructor(
    private readonly window: BrowserWindow,
    private readonly settings: SettingsService,
    public mode: SizeMode,
    private readonly onError: (error: unknown) => void,
    private readonly platform: NodeJS.Platform = process.platform
  ) {
    window.on('move', this.changed);
    window.on('resize', this.changed);
    window.on('will-move', this.interrupt);
    window.on('will-resize', this.interrupt);
  }

  private readonly interrupt = () => {
    this.cancelAnimation();
    this.destination = undefined;
    if (this.mode === 'compact') this.window.setMaximumSize(440, 0);
    this.changed();
  };

  private readonly changed = () => {
    if (this.stopped || this.animation !== undefined) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.save();
    }, 250);
  };

  save(): void {
    clearTimeout(this.timer);
    if (this.window.isDestroyed()) return;
    const bounds = this.destination ?? this.window.getNormalBounds();
    const mode = this.mode;

    this.tail = this.tail
      .then(async () => {
        const remembered = this.settings.current.settings.rememberedBounds;

        if (JSON.stringify(remembered[mode]) === JSON.stringify(bounds)) return;
        const result = await this.settings.services.updateSettings({
          rememberedBounds: { ...remembered, [mode]: bounds }
        });

        if (!result.ok) throw new Error(result.error.message);
      })
      .catch((error: unknown) => {
        this.saveError =
          error instanceof Error ? error : new Error('Unable to save window position.');
        this.onError(error);
      });
  }

  async switchMode(mode: SizeMode, reducedMotion: boolean): Promise<void> {
    if (mode === this.mode) return;
    this.cancelAnimation();
    this.save();
    await this.tail;
    if (this.saveError !== undefined) throw this.saveError;
    const current = this.window.getNormalBounds();
    const remembered = this.settings.current.settings.rememberedBounds[mode];
    const target = clampBounds(
      remembered ?? { ...current, ...modeGeometry[mode] },
      displayAreas(),
      mode
    );

    await restoreNormalWindow(this.window);
    this.mode = mode;
    this.window.setMaximumSize(0, 0);
    this.window.setMinimumSize(
      Math.min(modeGeometry[mode].minWidth, target.width),
      Math.min(modeGeometry[mode].minHeight, target.height)
    );
    if (this.platform === 'darwin' && !reducedMotion) this.animate(this.window.getBounds(), target);
    else this.finish(target);
  }

  private animate(from: Rectangle, target: Rectangle): void {
    const start = Date.now();

    this.destination = target;

    this.animation = setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / 180);
      const ease = 1 - (1 - progress) ** 3;
      const interpolate = (key: keyof Rectangle) =>
        Math.round(from[key] + (target[key] - from[key]) * ease);

      if (progress === 1) {
        this.cancelAnimation();
        this.finish(target);
      } else
        this.window.setBounds({
          x: interpolate('x'),
          y: interpolate('y'),
          width: interpolate('width'),
          height: interpolate('height')
        });
    }, 16);
  }

  private finish(target: Rectangle): void {
    this.window.setBounds(target);
    this.destination = undefined;
    if (this.mode === 'compact') this.window.setMaximumSize(target.width, 0);
    this.save();
  }

  reconcile(): void {
    this.cancelAnimation();
    const target = clampBounds(
      this.destination ?? this.window.getNormalBounds(),
      displayAreas(),
      this.mode
    );

    this.window.setMaximumSize(0, 0);
    this.window.setMinimumSize(
      Math.min(modeGeometry[this.mode].minWidth, target.width),
      Math.min(modeGeometry[this.mode].minHeight, target.height)
    );
    this.finish(target);
  }

  private cancelAnimation(): void {
    clearInterval(this.animation);
    this.animation = undefined;
  }

  async close(): Promise<void> {
    this.stopped = true;
    if (this.animation !== undefined) this.reconcile();
    this.save();
    await this.tail;
    if (this.saveError !== undefined) throw this.saveError;
  }
}
