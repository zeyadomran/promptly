import { expect, it, vi } from 'vitest';

import { canRecover, concealWindow, type WindowRecovery } from './visibility';

const unavailable: WindowRecovery = {
  trayAvailable: () => false,
  shortcutAvailable: () => false,
  dockAvailable: () => false
};

it('keeps a reachable window while requested tray/shortcut settings have no native controller', () => {
  const window = { hide: vi.fn(), minimize: vi.fn(), show: vi.fn() };

  expect(canRecover(unavailable)).toBe(false);
  concealWindow(window, unavailable, 'win32');
  expect(window.minimize).toHaveBeenCalledOnce();
  expect(window.hide).not.toHaveBeenCalled();
  concealWindow(window, unavailable, 'darwin');
  expect(window.show).toHaveBeenCalledOnce();
});

it('hides only with an available native recovery registration', () => {
  const window = { hide: vi.fn(), minimize: vi.fn(), show: vi.fn() };

  concealWindow(window, { ...unavailable, trayAvailable: () => true }, 'win32');
  expect(window.hide).toHaveBeenCalledOnce();
  expect(window.minimize).not.toHaveBeenCalled();
});
