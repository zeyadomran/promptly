import type { Settings } from '../../shared/contracts/settings';
import type { ShortcutTestState } from '../../shared/contracts/shortcut-test';
import type { HookFrame } from '../../shared/contracts/shortcuts';
import { DoubleTap } from './double-tap';

/** Observes the real shortcut input, never a capture command or clipboard operation. */
export class ShortcutTest {
  private readonly taps: DoubleTap;
  private detected = false;
  private cancelExpiry: (() => void) | undefined;
  private held: number;
  private closed = false;
  private expiryGeneration = 0;

  constructor(
    readonly owner: number,
    private readonly settings: Settings,
    held: number,
    private readonly publish: (state: ShortcutTestState) => void,
    private readonly schedule: (callback: () => void, delay: number) => () => void
  ) {
    this.held = held;
    this.taps = new DoubleTap(
      settings.saveShortcut.kind === 'double-tap' ? settings.saveShortcut.modifier : 'shift',
      settings.doubleTapWindowMs,
      () => undefined,
      (tap, elapsedMs) => {
        this.clearExpiry();
        if (tap === 2) this.detected = true;
        else {
          const generation = this.expiryGeneration;

          this.cancelExpiry = this.schedule(() => {
            if (this.closed || this.detected || generation !== this.expiryGeneration) return;
            this.cancelExpiry = undefined;
            this.taps.reset(this.held);
            this.publish({ status: 'waiting' });
          }, settings.doubleTapWindowMs);
        }

        publish({
          status: tap === 1 ? 'tap' : 'detected',
          ...(elapsedMs === undefined ? {} : { elapsedMs })
        });
      }
    );
    this.taps.reset(held);
  }

  receive(frame: HookFrame): void {
    if (this.closed || this.detected || this.settings.saveShortcut.kind !== 'double-tap') return;
    if (frame.kind === 'modifiers' || frame.kind === 'ready') this.held = frame.mask;
    if (
      frame.kind === 'reset' ||
      frame.kind === 'ready' ||
      frame.kind === 'cancel' ||
      frame.kind === 'health'
    ) {
      this.clearExpiry();
      this.publish({ status: 'waiting' });
    }

    this.taps.accept(frame);
  }

  combination(): void {
    if (this.closed || this.detected || this.settings.saveShortcut.kind !== 'combination') return;
    this.detected = true;
    this.publish({ status: 'detected' });
  }

  retire(status: 'inactive' | 'unavailable'): void {
    this.close();
    this.publish({ status });
  }

  close(): void {
    this.closed = true;
    this.clearExpiry();
  }

  private clearExpiry(): void {
    this.expiryGeneration++;
    this.cancelExpiry?.();
    this.cancelExpiry = undefined;
  }
}
