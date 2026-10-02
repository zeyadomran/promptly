import { afterEach, expect, it, vi } from 'vitest';

import { windowBoundsFixture } from './window-bounds-test-fixture';

vi.mock('electron', () => ({
  screen: {
    getPrimaryDisplay: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }),
    getAllDisplays: () => []
  }
}));

afterEach(() => {
  vi.useRealTimers();
});

const regular = { x: 100, y: 100, width: 1100, height: 700 };
const compact = { x: 10, y: 10, width: 440, height: 600 };

it('rapid mode switches preserve destination geometry rather than intermediate animation frames', async () => {
  vi.useFakeTimers();
  const { bounds, settings, window, snapshot } = windowBoundsFixture('darwin');

  await settings.services.updateSettings({ rememberedBounds: { regular, compact } });
  await bounds.switchMode('regular', false);
  await vi.advanceTimersByTimeAsync(64);
  expect(window.getBounds()).not.toEqual(regular);
  await bounds.switchMode('compact', false);
  expect(snapshot().settings.rememberedBounds.regular).toEqual(regular);
  await vi.advanceTimersByTimeAsync(64);
  await bounds.switchMode('regular', true);
  expect(window.getBounds()).toEqual(regular);
  await bounds.close();
  expect(snapshot().settings.rememberedBounds).toEqual({ regular, compact });
});

it('quit during animation settles the destination natively and drains its durable position', async () => {
  vi.useFakeTimers();
  const { bounds, settings, window, snapshot } = windowBoundsFixture('darwin');

  await settings.services.updateSettings({ rememberedBounds: { regular, compact } });
  await bounds.switchMode('regular', false);
  await vi.advanceTimersByTimeAsync(64);
  await bounds.close();
  expect(window.getBounds()).toEqual(regular);
  expect(snapshot().settings.rememberedBounds).toEqual({ regular, compact });
  await vi.advanceTimersByTimeAsync(500);
  expect(window.getBounds()).toEqual(regular);
});
