import { expect, it } from 'vitest';

import { concealWindow } from './visibility';

it('keeps a reachable window when its external recovery route disappears', () => {
  let visible = true;
  let shortcutAvailable = false;
  const window = {
    hide: () => {
      visible = false;
    },
    minimize: () => {
      visible = false;
    },
    show: () => {
      visible = true;
    }
  };
  const recovery = {
    trayAvailable: () => false,
    dockAvailable: () => false,
    shortcutAvailable: () => shortcutAvailable
  };

  concealWindow(window, recovery, 'darwin');
  expect(visible).toBe(true);
  shortcutAvailable = true;
  concealWindow(window, recovery, 'darwin');
  expect(visible).toBe(false);
  shortcutAvailable = false;
  concealWindow(window, recovery, 'darwin');
  expect(visible).toBe(true);
});
