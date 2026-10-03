import { expect, it } from 'vitest';

import { shortcutFixture } from '../shortcuts/shortcut-test-fixture';
import { concealWindow } from './visibility';

it('keeps recording focus and a reachable window when its external recovery route disappears', async () => {
  let state = 'visible';
  let foreground = 'settings';
  const showMain = () => {
    state = 'visible';
    foreground = 'main';
    return undefined;
  };

  const fixture = shortcutFixture((callback) => callback, 'win32', showMain);
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
    shortcutAvailable: () => fixture.shortcuts.recoveryAvailable
  };

  fixture.commands.open = showMain;
  try {
    concealWindow(window, recovery);
    expect(state).toBe('minimized');
    await fixture.shortcuts.controller.apply(fixture.settings);
    const open = fixture.registered.get(fixture.settings.openShortcut);

    concealWindow(window, recovery);
    expect(state).toBe('hidden');
    fixture.shortcuts.record(11, true);
    open?.();
    expect(fixture.shortcuts.status.recording).toBe(true);
    expect(fixture.shortcuts.recoveryAvailable).toBe(false);
    expect({ state, foreground }).toEqual({ state: 'hidden', foreground: 'settings' });
    fixture.shortcuts.record(12, true);
    fixture.shortcuts.release(11);
    expect(fixture.shortcuts.status.recording).toBe(true);
    fixture.shortcuts.release(12);
    expect(fixture.shortcuts.status.recording).toBe(false);
    expect(fixture.shortcuts.recoveryAvailable).toBe(true);
    expect({ state, foreground }).toEqual({ state: 'hidden', foreground: 'settings' });
    open?.();
    expect({ state, foreground }).toEqual({ state: 'visible', foreground: 'main' });
    fixture.registered.delete(fixture.settings.openShortcut);
    fixture.failures.add(fixture.settings.openShortcut);
    concealWindow(window, recovery);
    expect(state).toBe('minimized');
    await fixture.shortcuts.sleep();
    await fixture.shortcuts.resume();
    expect({ state, foreground }).toEqual({ state: 'visible', foreground: 'main' });
  } finally {
    await fixture.shortcuts.close();
  }
});
