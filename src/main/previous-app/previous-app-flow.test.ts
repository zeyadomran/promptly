import { expect, it, vi } from 'vitest';

import type { WindowsIdentity } from '../platform/windows/windows-selection';
import { assertPreviousAppNativeLifetime } from './native-lifetime-flow';
import { PreviousAppService } from './service';

it('retains only eligible external targets and hides only after confirmed current-target activation', async () => {
  const terminal: WindowsIdentity = {
    token: 'a'.repeat(32),
    source: { pid: 42, name: 'Windows Terminal', id: 'WindowsTerminal.exe' }
  };
  let foreground = terminal;
  let alive = true;
  let pinned = false;
  let visible = true;
  let activation: 'ok' | 'activationDenied' = 'ok';
  const previous = new PreviousAppService({
    ownPid: 7,
    native: {
      foregroundIdentityResult: () => Promise.resolve({ status: 'ok', identity: foreground }),
      sourceAvailable: () => Promise.resolve(alive),
      activateSource: () => Promise.resolve(activation)
    },
    alwaysOnTop: () => pinned,
    hide: () => {
      visible = false;
    }
  });

  expect(await previous.getPreviousApp()).toEqual({ state: 'none' });
  await previous.captureBeforeShow();
  expect(await previous.getPreviousApp()).toEqual({
    state: 'available',
    label: 'Windows Terminal'
  });
  foreground = { token: 'b'.repeat(32), source: { pid: 7, name: 'Promptly', id: 'Promptly.exe' } };
  await previous.captureBeforeShow();
  expect(await previous.getPreviousApp()).toEqual({
    state: 'available',
    label: 'Windows Terminal'
  });
  activation = 'activationDenied';
  expect(await previous.returnToPreviousApp()).toEqual({
    returned: 'denied',
    label: 'Windows Terminal'
  });
  expect(visible).toBe(true);
  alive = false;
  expect(await previous.returnToPreviousApp()).toEqual({
    returned: 'unavailable',
    label: 'Windows Terminal'
  });
  expect(await previous.getPreviousApp()).toEqual({ state: 'none' });
  alive = true;
  expect(await previous.getPreviousApp()).toEqual({
    state: 'available',
    label: 'Windows Terminal'
  });
  activation = 'ok';
  foreground = terminal;
  await previous.captureBeforeShow();
  pinned = true;
  expect(await previous.returnToPreviousApp()).toEqual({
    returned: 'returned',
    label: 'Windows Terminal'
  });
  expect(visible).toBe(true);
  pinned = false;
  expect(await previous.returnToPreviousApp()).toEqual({
    returned: 'returned',
    label: 'Windows Terminal'
  });
  expect(visible).toBe(false);
  previous.close();
  await assertPreviousAppNativeLifetime();
});

it('discards late foreground replies and retains the prior target while a helper warms or is busy', async () => {
  vi.useFakeTimers();
  const external: WindowsIdentity = {
    token: 'a'.repeat(32),
    source: { pid: 42, name: 'Owned terminal', id: 'Owned.exe' }
  };
  let release: (value: { status: 'ok'; identity: WindowsIdentity }) => void = () => undefined;
  let reply = Promise.resolve({ status: 'ok' as const, identity: external });
  const previous = new PreviousAppService({
    ownPid: 7,
    native: {
      foregroundIdentityResult: () => reply,
      sourceAvailable: () => Promise.resolve(true),
      activateSource: () => Promise.resolve('ok')
    },
    alwaysOnTop: () => false,
    hide: () => {
      throw new Error('Owned hide failure');
    }
  });

  try {
    await previous.captureBeforeShow();
    reply = new Promise((resolve) => {
      release = resolve;
    });
    const capture = previous.captureBeforeShow();

    await vi.advanceTimersByTimeAsync(100);
    await capture;
    release({
      status: 'ok',
      identity: { token: 'b'.repeat(32), source: { pid: 43, name: 'Late target', id: 'Late.exe' } }
    });
    await Promise.resolve();
    expect(await previous.getPreviousApp()).toEqual({
      state: 'available',
      label: 'Owned terminal'
    });
    expect(await previous.returnToPreviousApp()).toEqual({
      returned: 'returned',
      label: 'Owned terminal'
    });
    previous.close();
    expect(await previous.getPreviousApp()).toEqual({ state: 'none' });
    expect(await previous.returnToPreviousApp()).toEqual({ returned: 'unavailable' });
  } finally {
    previous.close();
    vi.useRealTimers();
  }
});
