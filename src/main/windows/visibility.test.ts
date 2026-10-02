import { expect, it } from 'vitest';

import { concealWindow } from './visibility';

it('keeps a reachable window when its external recovery route disappears', () => {
  let state = 'visible';
  let shortcutAvailable = false;
  const window = {
    hide: () => {
      state = 'hidden';
    },
    minimize: () => {
      state = 'minimized';
    }
  };
  const recovery = {
    trayAvailable: () => false,
    shortcutAvailable: () => shortcutAvailable
  };

  concealWindow(window, recovery);
  expect(state).toBe('minimized');
  shortcutAvailable = true;
  concealWindow(window, recovery);
  expect(state).toBe('hidden');
  shortcutAvailable = false;
  concealWindow(window, recovery);
  expect(state).toBe('minimized');
});
