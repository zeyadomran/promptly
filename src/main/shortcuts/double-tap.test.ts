import { expect, it } from 'vitest';

import type { ShortcutTestState } from '../../shared/contracts/shortcut-test';
import { completedTapFlow } from './completed-tap-test-flow';
import { nativeHookFixture } from './native-hook-fixture';
import { shortcutFixture } from './shortcut-test-fixture';

it('recognizes physical taps across native resync/recovery and retains suppression ownership', async () => {
  completedTapFlow();

  const expiries = new Set<() => void>();
  const keyboard = shortcutFixture(
    (callback) => callback,
    'win32',
    () => undefined,
    (callback, delay) => {
      expect(delay).toBe(300);
      expiries.add(callback);
      return () => {
        expiries.delete(callback);
      };
    }
  );
  let nativeCaptures = 0;

  keyboard.commands.capture = () => {
    nativeCaptures++;
    return undefined;
  };

  const native = nativeHookFixture(keyboard.shortcuts);
  const tap = [
    { kind: 'modifiers', mask: 1, repeat: false },
    { kind: 'modifiers', mask: 0, repeat: false }
  ] as const;

  try {
    await keyboard.shortcuts.controller.apply(keyboard.settings);
    const testStates: ShortcutTestState[] = [];
    const consent = keyboard.shortcuts.captureAdmission();

    keyboard.shortcuts.startTest(7, (state) => {
      testStates.push(state);
    });
    expect(consent?.()).toBe(false);
    expect(keyboard.shortcuts.captureAdmission()).toBeUndefined();
    keyboard.tap(1);
    expect(testStates.at(-1)?.status).toBe('tap');
    for (const expire of expiries) expire();
    expiries.clear();
    expect(testStates.at(-1)?.status).toBe('waiting');
    await native.send([...tap, ...tap]);
    expect(testStates.map((state) => state.status)).toEqual([
      'waiting',
      'tap',
      'waiting',
      'tap',
      'detected'
    ]);
    expect(testStates.at(-1)?.elapsedMs).toBe(2);
    expect(nativeCaptures).toBe(0);
    keyboard.shortcuts.record(7, true);
    expect(testStates.at(-1)?.status).toBe('inactive');
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(0);
    keyboard.shortcuts.release(7);
    keyboard.shortcuts.startTest(7, (state) => {
      testStates.push(state);
    });
    keyboard.shortcuts.stopTest(99);
    expect(keyboard.shortcuts.captureAdmission()).toBeUndefined();
    keyboard.shortcuts.stopTest(7);
    expect(expiries.size).toBe(0);
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(1);
    const admitted = keyboard.shortcuts.captureAdmission();

    await native.send([{ kind: 'reset' }]);
    expect(admitted?.()).toBe(false);
    expect(keyboard.shortcuts.status.hook).toBe('installed');
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(2);
    const beforeExit = keyboard.shortcuts.captureAdmission();

    keyboard.shortcuts.startTest(7, (state) => {
      testStates.push(state);
    });
    await native.exit();
    expect(testStates.at(-1)?.status).toBe('unavailable');
    keyboard.shortcuts.stopTest(7);
    expect(beforeExit?.()).toBe(false);
    expect(keyboard.shortcuts.status.hook).toBe('unavailable');
    expect(native.pendingDelays).toEqual([250]);
    native.advance(250);
    await expect.poll(() => keyboard.shortcuts.status.hook).toBe('installed');
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(3);

    keyboard.shortcuts.record(1, true);
    await native.exit();
    native.advance(500);
    await expect.poll(() => native.hook.health.installed).toBe(true);
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(3);
    keyboard.shortcuts.release(1);
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(4);

    await native.exit();
    expect(native.pendingDelays).toEqual([1000]);
    const beforeSleep = native.processes;

    await keyboard.shortcuts.sleep();
    native.advance(30_000);
    expect(native.pendingDelays).toEqual([]);
    expect(native.processes).toBe(beforeSleep);
    expect(keyboard.shortcuts.status.hook).toBe('suspended');

    native.setSilent(true);
    const resuming = keyboard.shortcuts.resume();

    await expect.poll(() => native.processes).toBe(beforeSleep + 1);
    native.advance(1500);
    await resuming;
    expect(keyboard.shortcuts.status.hook).toBe('unavailable');
    native.setSilent(false);
    native.advance(250);
    await expect.poll(() => native.hook.health.installed).toBe(true);
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(5);

    native.advance(30_000);
    for (const delayMs of [250, 500, 1000, 2000, 4000]) {
      await native.exit();
      expect(native.pendingDelays).toEqual([delayMs]);
      native.advance(delayMs);
      await expect.poll(() => native.hook.health.installed).toBe(true);
    }

    await native.exit();
    expect(keyboard.shortcuts.status.hook).toBe('unavailable');
    const exhaustedProcesses = native.processes;

    native.advance(30_000);
    expect(native.pendingDelays).toEqual([]);
    expect(native.processes).toBe(exhaustedProcesses);

    await keyboard.shortcuts.sleep();
    await keyboard.shortcuts.resume();
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(6);

    await native.exit();
    await keyboard.shortcuts.controller.apply({
      ...keyboard.settings,
      saveShortcut: { kind: 'combination', accelerator: 'Control+Alt+F9' }
    });
    keyboard.shortcuts.startTest(7, (state) => {
      testStates.push(state);
    });
    keyboard.registered.get('Control+Alt+F9')?.();
    expect(testStates.at(-1)).toEqual({ status: 'detected' });
    expect(nativeCaptures).toBe(6);
    await keyboard.shortcuts.sleep();
    expect(testStates.at(-1)).toEqual({ status: 'inactive' });
    keyboard.registered.get('Control+Alt+F9')?.();
    expect(nativeCaptures).toBe(6);
    await keyboard.shortcuts.close();
    const closedProcesses = native.processes;

    native.advance(30_000);
    expect(native.pendingDelays).toEqual([]);
    expect(native.processes).toBe(closedProcesses);
  } finally {
    await keyboard.shortcuts.close();
    await native.close();
  }
});
