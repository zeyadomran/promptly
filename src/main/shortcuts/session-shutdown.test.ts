import { expect, it, vi } from 'vitest';

import { shortcutFixture } from './shortcut-test-fixture';

it('accepted shutdown invalidates a late resume before native restore or visibility recovery', async () => {
  const fixture = shortcutFixture(vi.fn);

  await fixture.shortcuts.controller.apply(fixture.settings);
  fixture.shortcuts.record(10, true);
  await fixture.shortcuts.sleep();
  vi.clearAllMocks();
  let complete: (() => void) | undefined;

  fixture.hook.start = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      })
  );
  const resume = fixture.shortcuts.resume();

  await vi.waitFor(() => {
    expect(complete).toBeDefined();
  });
  fixture.registered.delete(fixture.settings.openShortcut);
  fixture.failures.add(fixture.settings.openShortcut);
  fixture.shortcuts.stopCommands();
  expect(fixture.hook.stop).not.toHaveBeenCalled();
  complete?.();
  await resume;
  expect(fixture.hook.stop).toHaveBeenCalledOnce();
  expect(fixture.api.register).not.toHaveBeenCalled();
  expect(fixture.recover).not.toHaveBeenCalled();
  expect(fixture.api.setSuspended).not.toHaveBeenCalled();
  expect(fixture.shortcuts.status.recording).toBe(true);
  expect(fixture.shortcuts.recoveryAvailable).toBe(false);
  fixture.registered.get(fixture.settings.pinShortcut)?.();
  expect(fixture.commands.pin).not.toHaveBeenCalled();
  await fixture.shortcuts.controller.apply({ ...fixture.settings, doubleTapWindowMs: 600 });
  fixture.shortcuts.release(10);
  expect(fixture.shortcuts.status.recording).toBe(false);
  await fixture.shortcuts.close();
});
