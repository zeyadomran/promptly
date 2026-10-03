import type { Settings } from '../../shared/contracts/settings';
import type { ShortcutTestState } from '../../shared/contracts/shortcut-test';
import type { HookFrame } from '../../shared/contracts/shortcuts';
import { ShortcutTest } from './shortcut-test';

export function scheduleShortcutTest(callback: () => void, delay: number): () => void {
  const timer = setTimeout(callback, delay);

  return () => {
    clearTimeout(timer);
  };
}

/** Detector retirement preserves the non-saving screen's admission ownership. */
export class ShortcutTesting {
  private detector: ShortcutTest | undefined;
  private owner: number | undefined;
  mask = 0;

  constructor(
    private readonly invalidate: () => void,
    private readonly schedule: typeof scheduleShortcutTest
  ) {}

  get active(): boolean {
    return this.detector !== undefined;
  }
  get blocked(): boolean {
    return this.owner !== undefined;
  }

  receive(frame: HookFrame, installed: boolean): boolean {
    if (frame.kind === 'modifiers' || frame.kind === 'ready') this.mask = frame.mask;
    if (
      (frame.kind === 'reset' && !installed) ||
      ((frame.kind === 'health' || frame.kind === 'ready') && !frame.installed)
    )
      this.retire('unavailable');
    if (this.detector === undefined) return false;
    this.detector.receive(frame);
    return true;
  }

  start(
    owner: number,
    settings: Settings | undefined,
    available: boolean,
    publish: (state: ShortcutTestState) => void
  ): void {
    this.retire('inactive');
    this.invalidate();
    this.owner = owner;
    if (settings === undefined || !available) {
      publish({ status: 'unavailable' });
      return;
    }

    this.detector = new ShortcutTest(
      owner,
      structuredClone(settings),
      this.mask,
      publish,
      this.schedule
    );
    publish({ status: 'waiting' });
  }

  stop(owner: number): void {
    if (this.owner !== owner) return;
    this.detector?.close();
    this.detector = undefined;
    this.owner = undefined;
    this.invalidate();
  }

  retire(status: 'inactive' | 'unavailable'): void {
    const detector = this.detector;

    this.detector = undefined;
    if (detector === undefined) return;
    this.invalidate();
    detector.retire(status);
  }

  combination(): void {
    this.detector?.combination();
  }
}
