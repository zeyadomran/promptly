import type { Settings } from '../../shared/contracts/settings';
import type { ShortcutTestState } from '../../shared/contracts/shortcut-test';
import type { HookFrame, ShortcutStatus } from '../../shared/contracts/shortcuts';
import type { KeyboardHook } from '../platform/keyboard/keyboard-hook';
import type { SettingsController } from '../settings/controllers';
import { type AcceleratorApi, Accelerators } from './accelerators';
import { CaptureAdmission } from './capture-admission';
import * as commandAdmission from './command-admission';
import { DoubleTap } from './double-tap';
import { HookSession } from './hook-session';
import { updateRecording } from './recording';
import { recoverBindings } from './registration-recovery';
import { shortcutController } from './settings-controller';
import { scheduleShortcutTest, ShortcutTesting } from './shortcut-testing';
import { shortcutStatus } from './status';

export class Shortcuts {
  readonly controller: SettingsController;
  private readonly accelerators: Accelerators;
  private readonly taps: DoubleTap;
  private preferences: Settings | undefined;
  private readonly recorders = new Set<number>();
  private paused = false;
  private closing = false;
  private readonly testing: ShortcutTesting;
  private readonly session: HookSession;
  private readonly admission = new CaptureAdmission(() => !this.blockedCapture);

  constructor(
    api: AcceleratorApi,
    private readonly commands: commandAdmission.ShortcutCommands,
    private readonly platform: NodeJS.Platform,
    private readonly recover: () => void = () => undefined,
    scheduleTest = scheduleShortcutTest
  ) {
    this.testing = new ShortcutTesting(() => {
      this.admission.invalidate();
      this.taps.reset(this.testing.mask);
    }, scheduleTest);
    this.accelerators = new Accelerators(api, (action) => {
      this.dispatch(action);
    });
    this.taps = new DoubleTap('shift', 300, () => {
      this.dispatch('capture');
    });
    this.session = new HookSession(
      () => {
        this.testing.retire('inactive');
        this.taps.reset();
        this.admission.invalidate();
      },
      () => {
        recoverBindings(this.preferences, this.accelerators, this.platform, this.recover);
      }
    );
    this.controller = shortcutController({
      previous: () => this.preferences,
      commit: (settings) => {
        this.testing.retire('inactive');
        this.preferences = settings;
        this.admission.invalidate();
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

  retry(): boolean {
    if (!commandAdmission.shortcutRetryAllowed(this.flags)) return false;
    this.admission.invalidate();
    this.taps.reset();
    recoverBindings(this.preferences, this.accelerators, this.platform, this.recover);
    return true;
  }

  captureAdmission(): (() => boolean) | undefined {
    return this.admission.begin();
  }

  receive(frame: HookFrame): void {
    commandAdmission.receiveShortcutFrame(frame, {
      testing: this.testing,
      taps: this.taps,
      admission: this.admission,
      blocked: this.blockedCapture,
      installed: this.session.hook?.health.installed === true,
      doubleTap: this.preferences?.saveShortcut.kind === 'double-tap'
    });
  }

  setPaused(paused: boolean): void {
    this.testing.retire('inactive');
    this.admission.invalidate();
    this.paused = paused;
    this.taps.reset();
  }

  record(owner: number, active: boolean): void {
    if (active) this.testing.retire('inactive');
    this.admission.invalidate();
    updateRecording(
      this.recorders,
      owner,
      active,
      this.closing,
      this.accelerators,
      this.controller,
      this.taps
    );
  }

  release(owner: number): void {
    this.stopTest(owner);
    if (this.recorders.has(owner)) this.record(owner, false);
  }

  startTest(owner: number, publish: (state: ShortcutTestState) => void): void {
    this.testing.start(
      owner,
      this.preferences,
      !commandAdmission.captureBlocked(this.flags, false) && this.status.capture === 'registered',
      publish
    );
  }

  stopTest(owner: number): void {
    this.testing.stop(owner);
  }

  get recoveryAvailable(): boolean {
    const { closing, sleeping, recording } = this.flags;

    return !closing && !sleeping && !recording && this.accelerators.registered('open');
  }

  get status(): ShortcutStatus {
    return shortcutStatus(
      this.preferences,
      this.session.hook?.health,
      this.accelerators,
      {
        ...this.flags,
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

  private get flags() {
    return {
      closing: this.closing,
      sleeping: this.session.sleeping,
      paused: this.paused,
      recording: this.recorders.size > 0,
      quarantined: this.accelerators.failed
    };
  }

  private get blockedCapture(): boolean {
    return commandAdmission.captureBlocked(this.flags, this.testing.blocked);
  }

  private dispatch(action: commandAdmission.ShortcutAction): void {
    commandAdmission.dispatchShortcut(action, this.commands, this.flags, this.testing);
  }
}
