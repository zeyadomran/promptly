import { afterEach, expect, it, vi } from 'vitest';

import { windowBoundsFixture } from './window-bounds-test-fixture';

const owned = vi.hoisted(() => ({
  primary: { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
  secondary: { id: 2, workArea: { x: -1280, y: -720, width: 1280, height: 700 } }
}));

vi.mock('electron', () => ({
  screen: {
    getPrimaryDisplay: () => owned.primary,
    getAllDisplays: () => [owned.primary, owned.secondary]
  }
}));

afterEach(() => {
  vi.useRealTimers();
});

it('replaces a sticky native Compact maximum before Regular resizing and preserves its stable width', async () => {
  const { bounds, window, snapshot } = windowBoundsFixture('darwin');
  let maximum = 440;
  const originalBounds = window.setBounds;

  vi.spyOn(window, 'setMaximumSize').mockImplementation((width) => {
    if (width > 0) maximum = width; // Cocoa retains the previous maximum for (0, 0).
    return undefined;
  });
  vi.spyOn(window, 'setBounds').mockImplementation((next) => {
    originalBounds({ ...next, width: Math.min(next.width, maximum) });
  });
  await bounds.switchMode('regular', true);
  expect(window.getBounds().width).toBe(1000);
  window.setBounds({ x: 100, y: 100, width: 1100, height: 700 });
  await bounds.switchMode('compact', true);
  await bounds.switchMode('regular', true);
  expect(window.getBounds()).toEqual({ x: 100, y: 100, width: 1100, height: 700 });
  await bounds.close();
  expect(snapshot().settings.rememberedBounds.regular?.width).toBe(1100);
});

it('updates finite native limits after moving to another display and changed DPI work areas', async () => {
  vi.useFakeTimers();
  const { bounds, window, listeners } = windowBoundsFixture();
  const maximum = vi.spyOn(window, 'setMaximumSize');

  await bounds.switchMode('regular', true);
  expect(maximum).toHaveBeenLastCalledWith(1920, 1040);
  window.setBounds({ x: -1200, y: -650, width: 1000, height: 640 });
  listeners.get('move')?.();
  expect(maximum).toHaveBeenLastCalledWith(1280, 700);
  const original = { ...owned.secondary.workArea };

  try {
    owned.secondary.workArea = { x: -900, y: -500, width: 900, height: 480 };
    bounds.reconcile();
    expect(maximum).toHaveBeenLastCalledWith(900, 480);
    expect(window.getBounds()).toEqual({ x: -900, y: -500, width: 900, height: 480 });
  } finally {
    owned.secondary.workArea = original;
    await bounds.close();
  }
});
