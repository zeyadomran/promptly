import type { Settings } from '../../shared/contracts/settings';
import type { HookFrame, ShortcutStatus } from '../../shared/contracts/shortcuts';
import type { KeyboardHook } from '../platform/keyboard/keyboard-hook';
import type { SettingsController } from '../settings/controllers';
import { type AcceleratorApi, Accelerators } from './accelerators';
import { bindings, type ShortcutAction } from './bindings';
import { DoubleTap } from './double-tap';
import { shortcutController } from './settings-controller';
import { shortcutStatus } from './status';

export interface ShortcutCommands {
  capture: () => void;
  open: () => void;
  pin: () => void;
  captureAvailable: () => boolean;
}

export class Shortcuts {
  private readonly accelerators: Accelerators;
  private readonly taps: DoubleTap;
  private preferences: Settings | undefined;
  private readonly recorders = new Set<number>();
  private paused = false;
  private sleeping = false;
  private closing = false;
  private hook: KeyboardHook | undefined;

  constructor(
    api: AcceleratorApi,
    private readonly commands: ShortcutCommands,
    private readonly platform: NodeJS.Platform,
    private readonly recover: () => void = () => undefined
  ) {
    this.accelerators = new Accelerators(api, (action) => {
      this.dispatch(action);
    });
    this.taps = new DoubleTap('shift', 300, () => {
      this.dispatch('capture');
    });
    this.controller = shortcutController({
      previous: () => this.preferences,
      commit: (settings) => {
        this.preferences = settings;
      },
      hook: () => this.hook,
      recording: () => this.recorders.size > 0,
      accelerators: this.accelerators,
      taps: this.taps,
      platform,
      recover
    });
  }

  attachHook(hook: KeyboardHook): void {
    this.hook = hook;
  }

  readonly controller: SettingsController;

  receive(frame: HookFrame): void {
    if (
      this.blockedCapture ||
      this.hook?.health.installed !== true ||
      this.preferences?.saveShortcut.kind !== 'double-tap'
    ) {
      this.taps.reset(
        frame.kind === 'modifiers' || frame.kind === 'ready' ? frame.mask : undefined
      );
      return;
    }

    this.taps.accept(frame);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.taps.reset();
  }

  record(owner: number, active: boolean): void {
    if (this.closing) throw new Error('Shortcuts are shutting down.');
    if (active) this.recorders.add(owner);
    else this.recorders.delete(owner);
    try {
      this.accelerators.suspend(this.recorders.size > 0);
    } catch (error) {
      this.recorders.delete(owner);
      try {
        this.accelerators.suspend(this.recorders.size > 0);
      } catch {
        this.controller.quarantine?.();
      }

      this.taps.reset();
      throw error;
    }

    this.taps.reset();
    if (active) this.recover();
  }

  release(owner: number): void {
    if (this.recorders.has(owner)) this.record(owner, false);
  }

  get recoveryAvailable(): boolean {
    return (
      !this.closing &&
      !this.sleeping &&
      this.recorders.size === 0 &&
      this.accelerators.registered('open')
    );
  }

  get status(): ShortcutStatus {
    return shortcutStatus(
      this.preferences,
      this.hook?.health,
      this.accelerators,
      {
        sleeping: this.sleeping,
        paused: this.paused,
        recording: this.recorders.size > 0,
        captureAvailable: this.commands.captureAvailable()
      },
      this.platform
    );
  }
  async sleep(): Promise<void> {
    this.sleeping = true;
    this.taps.reset();
    await this.hook?.stop();
  }

  async resume(): Promise<void> {
    if (this.closing) return;
    await this.hook?.start();
    if (this.isClosing) {
      await this.hook?.stop();
      return;
    }

    this.taps.reset();
    if (this.preferences !== undefined)
      this.accelerators.replace(bindings(this.preferences, this.platform), true);
    this.sleeping = false;
  }

  stopCommands(): void {
    this.closing = true;
    this.taps.reset();
  }

  async close(): Promise<void> {
    this.stopCommands();
    this.recorders.clear();
    try {
      this.accelerators.close();
    } finally {
      await this.hook?.stop();
    }
  }

  private get blockedCapture(): boolean {
    return (
      this.closing ||
      this.sleeping ||
      this.paused ||
      this.recorders.size > 0 ||
      this.accelerators.failed
    );
  }

  private get isClosing(): boolean {
    return this.closing;
  }

  private dispatch(action: ShortcutAction): void {
    if (
      this.closing ||
      this.sleeping ||
      this.recorders.size > 0 ||
      this.accelerators.failed ||
      (action === 'capture' && this.blockedCapture)
    )
      return;
    try {
      this.commands[action]();
    } catch {
      /* Commands cannot escape an OS callback. */
    }
  }
}
