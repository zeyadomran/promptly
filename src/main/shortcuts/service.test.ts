import { expect, it, vi } from 'vitest';

import { shortcutFixture } from './shortcut-test-fixture';

it('initial registration failure is honest and does not prevent startup or available bindings', async () => {
  const fixture = shortcutFixture(vi.fn);

  fixture.failures.add(fixture.settings.openShortcut);
  fixture.hook.health.installed = false;
  await fixture.shortcuts.controller.apply(fixture.settings);
  expect(fixture.shortcuts.status).toMatchObject({
    capture: 'unavailable',
    open: 'unavailable',
    pin: 'registered',
    hook: 'unavailable'
  });
  expect(fixture.shortcuts.recoveryAvailable).toBe(false);
  await fixture.shortcuts.controller.apply({
    ...fixture.settings,
    saveShortcut: { kind: 'combination', accelerator: 'Control+Alt+F12' }
  });
  expect(fixture.shortcuts.status.capture).toBe('registered');
});

it('pauses capture only and resets timing while open/pin remain active', async () => {
  const fixture = shortcutFixture(vi.fn);

  await fixture.shortcuts.controller.apply(fixture.settings);
  fixture.tap(0);
  fixture.shortcuts.setPaused(true);
  fixture.tap(100);
  fixture.registered.get(fixture.settings.openShortcut)?.();
  fixture.registered.get(fixture.settings.pinShortcut)?.();
  expect(fixture.commands.open).toHaveBeenCalledOnce();
  expect(fixture.commands.pin).toHaveBeenCalledOnce();
  expect(fixture.commands.capture).not.toHaveBeenCalled();
  expect(fixture.api.setSuspended).not.toHaveBeenCalled();
  fixture.shortcuts.setPaused(false);
  fixture.tap(200);
  expect(fixture.commands.capture).not.toHaveBeenCalled();
  fixture.tap(300);
  expect(fixture.commands.capture).toHaveBeenCalledOnce();
});

it('recorder ownership survives hook reset, sleep/resume and another owner finishing', async () => {
  const fixture = shortcutFixture(vi.fn);

  await fixture.shortcuts.controller.apply(fixture.settings);
  fixture.shortcuts.record(10, true);
  fixture.shortcuts.record(20, true);
  fixture.frame({ kind: 'reset', timeMs: 0 });
  await fixture.shortcuts.sleep();
  await fixture.shortcuts.resume();
  fixture.shortcuts.release(10);
  fixture.tap(0);
  fixture.tap(100);
  expect(fixture.commands.capture).not.toHaveBeenCalled();
  expect(fixture.shortcuts.status.recording).toBe(true);
  expect(fixture.shortcuts.recoveryAvailable).toBe(false);
  fixture.shortcuts.release(20);
  fixture.tap(200);
  fixture.tap(300);
  expect(fixture.commands.capture).toHaveBeenCalledOnce();
  expect(fixture.shortcuts.recoveryAvailable).toBe(true);
  expect(fixture.api.setSuspended).toHaveBeenLastCalledWith(false);
});

it('blocks a binding transaction during a recorder but allows timing and rollback', async () => {
  const fixture = shortcutFixture(vi.fn);

  await fixture.shortcuts.controller.apply(fixture.settings);
  fixture.shortcuts.record(10, true);
  await expect(
    fixture.shortcuts.controller.apply({ ...fixture.settings, openShortcut: 'Control+Alt+F9' })
  ).rejects.toThrow('recording');
  await fixture.shortcuts.controller.apply(fixture.settings);
  await fixture.shortcuts.controller.apply({ ...fixture.settings, doubleTapWindowMs: 600 });
  expect(fixture.shortcuts.status.recording).toBe(true);
});

it('hook loss does not synthesize capture and a fresh session resets the first tap', async () => {
  const fixture = shortcutFixture(vi.fn);

  await fixture.shortcuts.controller.apply(fixture.settings);
  fixture.tap(0);
  fixture.hook.health.installed = false;
  fixture.frame({ kind: 'reset', timeMs: 30 });
  fixture.tap(100);
  fixture.tap(200);
  expect(fixture.commands.capture).not.toHaveBeenCalled();
  fixture.hook.health.installed = true;
  fixture.frame({
    kind: 'ready',
    installed: true,
    mask: 0,
    timeMs: 0,
    accessibility: null,
    inputMonitoring: null
  });
  fixture.tap(0);
  expect(fixture.commands.capture).not.toHaveBeenCalled();
  fixture.tap(100);
  expect(fixture.commands.capture).toHaveBeenCalledOnce();
});

it('stops command callbacks immediately while accepted settings apply until resource close', async () => {
  const fixture = shortcutFixture(vi.fn);

  await fixture.shortcuts.controller.apply(fixture.settings);
  fixture.shortcuts.stopCommands();
  await fixture.shortcuts.controller.apply({ ...fixture.settings, openShortcut: 'Control+Alt+F9' });
  fixture.registered.get('Control+Alt+F9')?.();
  fixture.tap(0);
  fixture.tap(100);
  expect(fixture.commands.open).not.toHaveBeenCalled();
  expect(fixture.commands.capture).not.toHaveBeenCalled();
  await fixture.shortcuts.close();
  expect(fixture.registered.size).toBe(0);
  expect(fixture.hook.stop).toHaveBeenCalledOnce();
});
