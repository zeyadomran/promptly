import { EventEmitter } from 'node:events';

import type { WebContents } from 'electron';
import { expect, it, vi } from 'vitest';

import { recorderServices } from './ipc-services';
import { shortcutFixture } from './shortcut-test-fixture';

it.each(['destroyed', 'render-process-gone'] as const)(
  'releases recorder on %s during shutdown without resuming callbacks',
  async (event) => {
    const fixture = shortcutFixture(vi.fn);
    const contents = Object.assign(new EventEmitter(), { id: 10 });

    await fixture.shortcuts.controller.apply(fixture.settings);
    await recorderServices(fixture.shortcuts)(contents as WebContents).setShortcutRecording({
      active: true
    });
    fixture.shortcuts.stopCommands();
    expect(() => {
      contents.emit(event);
      contents.emit(event);
    }).not.toThrow();
    expect(fixture.shortcuts.status.recording).toBe(false);
    expect(fixture.api.setSuspended).toHaveBeenLastCalledWith(true);
    fixture.registered.get(fixture.settings.openShortcut)?.();
    expect(fixture.commands.open).not.toHaveBeenCalled();
    await fixture.shortcuts.close();
  }
);

it('restores a reachable window after resume loses its only registered open route', async () => {
  const fixture = shortcutFixture(vi.fn);

  await fixture.shortcuts.controller.apply(fixture.settings);
  await fixture.shortcuts.sleep();
  fixture.registered.delete(fixture.settings.openShortcut);
  fixture.failures.add(fixture.settings.openShortcut);
  await fixture.shortcuts.resume();
  expect(fixture.shortcuts.status.open).toBe('unavailable');
  expect(fixture.shortcuts.recoveryAvailable).toBe(false);
  expect(fixture.recover).toHaveBeenCalledOnce();
});

it('a newer suspend retires a late resume and preserves recorder ownership', async () => {
  const fixture = shortcutFixture(vi.fn);

  await fixture.shortcuts.controller.apply(fixture.settings);
  fixture.shortcuts.record(10, true);
  await fixture.shortcuts.sleep();
  let complete: (() => void) | undefined;

  fixture.hook.start = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      })
  );
  const oldResume = fixture.shortcuts.resume();

  await vi.waitFor(() => {
    expect(complete).toBeDefined();
  });
  const newerSleep = fixture.shortcuts.sleep();

  complete?.();
  await Promise.all([oldResume, newerSleep]);
  expect(fixture.shortcuts.status).toMatchObject({ hook: 'suspended', recording: true });
  expect(fixture.api.setSuspended).toHaveBeenLastCalledWith(true);
  expect(fixture.hook.stop).toHaveBeenCalledTimes(3);
  fixture.registered.get(fixture.settings.openShortcut)?.();
  expect(fixture.commands.open).not.toHaveBeenCalled();
});
