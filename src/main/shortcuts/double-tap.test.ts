import { describe, expect, it, vi } from 'vitest';

import type { HookFrame, Modifier } from '../../shared/contracts/shortcuts';
import { DoubleTap } from './double-tap';

function sequence(modifier: Modifier = 'shift', windowMs = 300) {
  const trigger = vi.fn();
  const taps = new DoubleTap(modifier, windowMs, trigger);
  const event = (mask: number, timeMs: number, repeat = false) => {
    taps.accept({ kind: 'modifiers', mask, repeat, timeMs });
  };

  return { taps, trigger, event };
}

describe('completed physical modifier taps', () => {
  it.each([150, 300, 600])('accepts the exact %i ms completed-release boundary', (windowMs) => {
    const { trigger, event } = sequence('shift', windowMs);

    event(1, 0);
    event(0, 20);
    event(2, windowMs);
    expect(trigger).not.toHaveBeenCalled();
    event(0, windowMs + 20);
    expect(trigger).toHaveBeenCalledOnce();
  });
  it.each([150, 300, 600])('rejects one ms beyond the %i ms boundary', (windowMs) => {
    const { trigger, event } = sequence('shift', windowMs);

    event(1, 0);
    event(0, 20);
    event(1, windowMs);
    event(0, windowMs + 21);
    expect(trigger).not.toHaveBeenCalled();
  });
  it.each([
    ['shift', 1],
    ['control', 4],
    ['alt', 16],
    ['meta', 64]
  ] as const)('supports both physical sides of %s', (modifier, mask) => {
    const { trigger, event } = sequence(modifier);

    event(mask, 0);
    event(0, 20);
    event(mask * 2, 100);
    event(0, 120);
    expect(trigger).toHaveBeenCalledOnce();
    event(mask, 150);
    event(0, 170);
    expect(trigger).toHaveBeenCalledOnce();
  });
  it.each([
    { frames: [{ kind: 'cancel', timeMs: 50 }] },
    {
      frames: [
        { kind: 'modifiers', mask: 4, repeat: false, timeMs: 50 },
        { kind: 'modifiers', mask: 0, repeat: false, timeMs: 60 }
      ]
    },
    { frames: [{ kind: 'reset', timeMs: 50 }] }
  ] satisfies { frames: HookFrame[] }[])(
    'cancels across ordinary keys, other modifiers and hook loss',
    ({ frames }) => {
      const { taps, trigger, event } = sequence();

      event(1, 0);
      event(0, 20);
      for (const frame of frames) taps.accept(frame);
      event(1, 100);
      event(0, 120);
      expect(trigger).not.toHaveBeenCalled();
    }
  );
  it('rejects overlapping left/right presses and recovers only after neutral', () => {
    const { trigger, event } = sequence();

    event(1, 0);
    event(0, 20);
    event(1, 60);
    event(3, 70);
    event(2, 80);
    event(0, 90);
    expect(trigger).not.toHaveBeenCalled();
    event(2, 100);
    event(0, 120);
    event(1, 140);
    event(0, 160);
    expect(trigger).toHaveBeenCalledOnce();
  });
  it.each(['repeat', 'hold', 'typing', 'backward'] as const)(
    'rejects %s within a press',
    (reason) => {
      const { taps, trigger, event } = sequence();

      event(1, 0);
      if (reason === 'repeat') event(1, 10, true);
      if (reason === 'typing') taps.accept({ kind: 'cancel', timeMs: 10 });
      event(0, reason === 'hold' ? 301 : 20);
      event(1, reason === 'backward' ? 1 : 350);
      event(0, reason === 'backward' ? 2 : 370);
      expect(trigger).not.toHaveBeenCalled();
    }
  );
  it('resets timing on configuration and ignores a key held at new-session readiness', () => {
    const { taps, trigger, event } = sequence();

    event(1, 0);
    event(0, 20);
    taps.configure('shift', 600);
    event(1, 40);
    event(0, 60);
    expect(trigger).not.toHaveBeenCalled();
    taps.accept({
      kind: 'ready',
      installed: true,
      mask: 1,
      timeMs: 80,
      accessibility: null,
      inputMonitoring: null
    });
    event(0, 100);
    event(1, 120);
    event(0, 140);
    expect(trigger).not.toHaveBeenCalled();
  });
});
