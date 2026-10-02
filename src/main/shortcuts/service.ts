import type { Settings } from '../../shared/contracts/settings';
import type { HookFrame, ShortcutStatus } from '../../shared/contracts/shortcuts';
import type { KeyboardHook } from '../platform/keyboard/keyboard-hook';
import type { SettingsController } from '../settings/controllers';
import { type AcceleratorApi, Accelerators } from './accelerators';
import { bindings, type ShortcutAction } from './bindings';
import { DoubleTap } from './double-tap';
import { HookSession } from './hook-session';
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
  private closing = false;
  private readonly session: HookSession;

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
    this.session = new HookSession(
      () => {
        this.taps.reset();
      },
      () => {
        if (this.preferences !== undefined)
          this.accelerators.replace(bindings(this.preferences, this.platform), true);
        if (!this.accelerators.registered('open')) this.recover();
      }
    );
    this.controller = shortcutController({
      previous: () => this.preferences,
      commit: (settings) => {
        this.preferences = settings;
      },
      hook: () => this.session.hook,
      recording: () => this.recorders.size > 0,
      accelerators: this.accelerators,
      taps: this.taps,
      platform,
      recover
    });
  }

  attachHook(hook: KeyboardHook): void {
    this.session.hook = hook;
  }

  readonly controller: SettingsController;

  receive(frame: HookFrame): void {
    if (
      this.blockedCapture ||
      this.session.hook?.health.installed !== true ||
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
    if (this.closing) {
      if (active) throw new Error('Shortcuts are shutting down.');
      this.recorders.delete(owner);
      this.taps.reset();
      return;
    }

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
      !this.session.sleeping &&
      this.recorders.size === 0 &&
      this.accelerators.registered('open')
    );
  }

  get status(): ShortcutStatus {
    return shortcutStatus(
      this.preferences,
      this.session.hook?.health,
      this.accelerators,
      {
        sleeping: this.session.sleeping,
        paused: this.paused,
        recording: this.recorders.size > 0,
        captureAvailable: this.commands.captureAvailable()
      },
      this.platform
    );
  }
  async sleep(): Promise<void> {
    await this.session.sleep();
  }

  async resume(): Promise<void> {
    if (this.closing) return;
    await this.session.resume();
  }

  stopCommands(): void {
    this.closing = true;
    this.session.invalidate();
  }

  async close(): Promise<void> {
    this.stopCommands();
    this.recorders.clear();
    try {
      this.accelerators.close();
    } finally {
      await this.session.close();
    }
  }

  private get blockedCapture(): boolean {
    return (
      this.closing ||
      this.session.sleeping ||
      this.paused ||
      this.recorders.size > 0 ||
      this.accelerators.failed
    );
  }

  private dispatch(action: ShortcutAction): void {
    if (
      this.closing ||
      this.session.sleeping ||
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
