import type { HookFrame, Modifier } from '../../shared/contracts/shortcuts';

const masks: Record<Modifier, readonly number[]> = {
  shift: [1, 2],
  control: [4, 8],
  alt: [16, 32],
  meta: [64, 128]
};

/** Eight physical bits, two per modifier. A completed release is the tap timestamp. */
export class DoubleTap {
  private held = 0;
  private pressedAt: number | undefined;
  private firstRelease: number | undefined;
  private lastTime = 0;

  constructor(
    private modifier: Modifier,
    private windowMs: number,
    private readonly trigger: () => void
  ) {}

  configure(modifier: Modifier, windowMs: number): void {
    this.modifier = modifier;
    this.windowMs = windowMs;
    this.reset(this.held);
  }

  reset(held = 0): void {
    this.held = held;
    this.pressedAt = undefined;
    this.firstRelease = undefined;
    this.lastTime = 0;
  }

  accept(frame: HookFrame): void {
    if (frame.kind === 'ready') {
      this.reset(frame.mask);
      return;
    }

    if (frame.kind === 'reset' || frame.kind === 'health') {
      this.reset(this.held);
      return;
    }

    if (frame.timeMs < this.lastTime) {
      this.reset(this.held);
      return;
    }

    this.lastTime = frame.timeMs;
    if (frame.kind === 'cancel') {
      this.pressedAt = undefined;
      this.firstRelease = undefined;
      return;
    }

    const previous = this.held;

    this.held = frame.mask;
    if (frame.repeat || (frame.mask !== 0 && !masks[this.modifier].includes(frame.mask))) {
      this.pressedAt = undefined;
      this.firstRelease = undefined;
      return;
    }

    if (previous === 0 && frame.mask !== 0) {
      this.pressedAt = frame.timeMs;
      return;
    }

    if (frame.mask !== 0 || previous === 0 || this.pressedAt === undefined) return;
    const duration = frame.timeMs - this.pressedAt;

    this.pressedAt = undefined;
    if (duration > this.windowMs) {
      this.firstRelease = undefined;
      return;
    }

    if (this.firstRelease !== undefined && frame.timeMs - this.firstRelease <= this.windowMs) {
      this.firstRelease = undefined;
      this.trigger();
    } else this.firstRelease = frame.timeMs;
  }
}
