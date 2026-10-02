// @vitest-environment node
import { spawn } from 'node:child_process';
import path from 'node:path';

import { expect, it, vi } from 'vitest';

import { NativeKeyboardHook } from './keyboard-hook';

it.each(['ready', 'denied', 'malformed', 'oversized', 'timeout'] as const)(
  'bounds native %s readiness and releases the owned process',
  async (mode) => {
    const receive = vi.fn();
    const child = spawn(
      process.execPath,
      [path.resolve('tests/fixtures/keyboard-transport.mjs'), mode],
      { stdio: 'pipe', windowsHide: true }
    );
    const hook = new NativeKeyboardHook(() => child, receive);

    await hook.start();
    expect(hook.health.installed).toBe(mode === 'ready');
    if (mode === 'denied')
      expect(hook.health).toEqual({
        installed: false,
        accessibility: false,
        inputMonitoring: false
      });
    await hook.stop();
    expect(hook.health.installed).toBe(false);
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
  }
);

it('native reset marks the hook unavailable and restart observes a new owned session', async () => {
  const receive = vi.fn();
  const hook = new NativeKeyboardHook(
    () =>
      spawn(process.execPath, [path.resolve('tests/fixtures/keyboard-transport.mjs'), 'reset'], {
        stdio: 'pipe',
        windowsHide: true
      }),
    receive
  );

  await hook.start();
  await vi.waitFor(() => {
    expect(hook.health.installed).toBe(false);
  });
  expect(receive).toHaveBeenCalledWith({ kind: 'reset', timeMs: 20 });
  await hook.stop();
  await hook.start();
  expect(hook.health.installed).toBe(true);
  await hook.stop();
});
