import { describe, expect, it } from 'vitest';

import { clampBounds } from './geometry';

const primary = { x: 0, y: 0, width: 1920, height: 1040 };
const left = { x: -1600, y: -200, width: 1600, height: 900 };

describe('display-aware DIP restoration', () => {
  it('keeps a negative-coordinate monitor and enforces independent mode constraints', () => {
    const saved = { x: -1400, y: -100, width: 1200, height: 800 };

    expect(clampBounds(saved, [primary, left], 'regular')).toEqual(saved);
    expect(clampBounds(saved, [primary, left], 'compact')).toEqual({ ...saved, width: 440 });
  });
  it('recovers disconnected and partially visible windows completely onto the work area', () => {
    expect(
      clampBounds({ x: -1400, y: -100, width: 1000, height: 640 }, [primary], 'regular')
    ).toEqual({ x: 0, y: 0, width: 1000, height: 640 });
    expect(
      clampBounds({ x: 1800, y: 990, width: 1000, height: 640 }, [primary], 'regular')
    ).toEqual({ x: 920, y: 400, width: 1000, height: 640 });
  });
  it('uses current DIP work area after DPI changes and never exceeds a small screen', () => {
    expect(
      clampBounds(
        { x: 1300, y: 700, width: 1200, height: 800 },
        [{ x: 0, y: 0, width: 700, height: 400 }],
        'regular'
      )
    ).toEqual({ x: 0, y: 0, width: 700, height: 400 });
  });
  it('centers defaults and gives settings/onboarding their own layouts', () => {
    expect(clampBounds(null, [primary], 'regular')).toEqual({
      x: 460,
      y: 200,
      width: 1000,
      height: 640
    });
    expect(clampBounds(null, [primary], 'compact', 'onboarding').width).toBe(760);
    expect(clampBounds(null, [primary], 'compact', 'settings').width).toBe(800);
  });
});
