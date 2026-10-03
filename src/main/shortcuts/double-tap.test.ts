import { expect, it } from 'vitest';

import { DoubleTap } from './double-tap';
import { nativeHookFixture } from './native-hook-fixture';
import { shortcutFixture } from './shortcut-test-fixture';

it('recognizes physical taps across native resync/recovery and retains suppression ownership', async () => {
  let captures = 0;
  const taps = new DoubleTap('shift', 300, () => {
    captures += 1;
  });
  const press = (mask: number, timeMs: number) => {
    taps.accept({ kind: 'modifiers', mask, repeat: false, timeMs });
  };

  press(1, 0);
  press(0, 20);
  press(2, 100);
  expect(captures).toBe(0);
  press(0, 120);
  expect(captures).toBe(1);
  press(1, 200);
  press(0, 220);
  taps.accept({ kind: 'cancel', timeMs: 230 });
  press(1, 260);
  press(0, 280);
  expect(captures).toBe(1);
  press(1, 600);
  press(0, 901);
  press(1, 950);
  press(0, 970);
  expect(captures).toBe(1);

  const keyboard = shortcutFixture((callback) => callback);
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
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(1);
    const admitted = keyboard.shortcuts.captureAdmission();

    await native.send([{ kind: 'reset' }]);
    expect(admitted?.()).toBe(false);
    expect(keyboard.shortcuts.status.hook).toBe('installed');
    await native.send([...tap, ...tap]);
    expect(nativeCaptures).toBe(2);
    const beforeExit = keyboard.shortcuts.captureAdmission();

    await native.exit();
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
