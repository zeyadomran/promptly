import { type BrowserWindow, screen } from 'electron';

import type { SizeMode } from '../../shared/contracts/window';
import type { SettingsService } from '../settings/service';
import { clampBounds, modeGeometry, type Rectangle, workAreaForBounds } from './geometry';
import { restoreNormalWindow } from './normal-window';

export function displayAreas() {
  const primary = screen.getPrimaryDisplay();

  return [primary, ...screen.getAllDisplays().filter((display) => display.id !== primary.id)].map(
    (display) => display.workArea
  );
}

/** Owns stable normal geometry; maximize/fullscreen and animation frames never become preferences. */
export class WindowBounds {
  mode: SizeMode;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private tail: Promise<void> = Promise.resolve();
  private stopped = false;
  private saveError: Error | undefined;
  private limitsKey: string | undefined;
  private applyingLimits = false;

  constructor(
    private readonly window: BrowserWindow,
    private readonly settings: SettingsService,
    private readonly onError: (error: unknown) => void
  ) {
    this.mode = settings.current.settings.defaultSizeMode;
    window.on('move', this.changed);
    window.on('resize', this.changed);
    window.on('will-move', this.interrupt);
    window.on('will-resize', this.interrupt);
  }

  private readonly interrupt = () => {
    this.setLimits(this.window.getNormalBounds(), this.mode === 'compact');
    this.changed();
  };

  private readonly changed = () => {
    if (this.stopped || this.applyingLimits || this.window.isDestroyed()) return;
    this.setLimits(this.window.getNormalBounds(), this.mode === 'compact');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.save();
    }, 250);
  };

  private setLimits(bounds: Rectangle, fixedWidth: boolean): void {
    const area = workAreaForBounds(bounds, displayAreas());
    const minimum = modeGeometry[this.mode];
    const maximumWidth = fixedWidth ? Math.min(440, area.width) : area.width;
    const key = `${this.mode}:${String(maximumWidth)}:${String(area.height)}`;

    if (key === this.limitsKey) return;
    this.limitsKey = key;
    this.applyingLimits = true;
    try {
      this.window.setMaximumSize(maximumWidth, area.height);
      this.window.setMinimumSize(
        Math.min(minimum.minWidth, area.width),
        Math.min(minimum.minHeight, area.height)
      );
    } finally {
      this.applyingLimits = false;
    }
  }

  save(): void {
    clearTimeout(this.timer);
    if (this.window.isDestroyed()) return;
    const bounds = this.window.getNormalBounds();
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
      .then(() => {
        this.saveError = undefined;
      })
      .catch((error: unknown) => {
        this.saveError =
          error instanceof Error ? error : new Error('Unable to save window position.');
        this.onError(error);
      });
  }

  async switchMode(mode: SizeMode): Promise<void> {
    if (mode === this.mode) return;
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
    this.setLimits(target, false);
    this.finish(target);
  }

  private finish(target: Rectangle): void {
    this.setLimits(target, this.mode === 'compact');
    this.window.setBounds(target);
    this.save();
  }

  reconcile(): void {
    const target = clampBounds(this.window.getNormalBounds(), displayAreas(), this.mode);

    this.finish(target);
  }

  async close(): Promise<void> {
    this.stopped = true;
    this.save();
    await this.tail;
    if (this.saveError !== undefined) throw this.saveError;
  }
}
