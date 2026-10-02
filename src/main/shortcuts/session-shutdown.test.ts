import { expect, it, vi } from 'vitest';

import { shortcutFixture } from './shortcut-test-fixture';

it('a late resume cannot revive commands after shutdown', async () => {
  const fixture = shortcutFixture((callback) => callback);
  let pins = 0;
  let nativeActive = false;
  let complete: (() => void) | undefined;

  fixture.commands.pin = () => {
    pins += 1;
  };

  await fixture.shortcuts.controller.apply(fixture.settings);
  const savedPin = fixture.registered.get(fixture.settings.pinShortcut);

  await fixture.shortcuts.sleep();
  fixture.hook.start = () =>
    new Promise<void>((resolve) => {
      complete = () => {
        nativeActive = true;
        resolve();
      };
    });
  fixture.hook.stop = () => {
    nativeActive = false;
    return Promise.resolve();
  };

  const resume = fixture.shortcuts.resume();

  await vi.waitFor(() => {
    expect(complete).toBeDefined();
  });
  fixture.shortcuts.stopCommands();
  complete?.();
  await resume;
  savedPin?.();
  expect(pins).toBe(0);
  expect(nativeActive).toBe(false);
  expect(fixture.shortcuts.recoveryAvailable).toBe(false);
  await fixture.shortcuts.close();
  await fixture.shortcuts.resume();
  expect(fixture.registered.size).toBe(0);
  expect(fixture.shortcuts.status.recording).toBe(false);
});
