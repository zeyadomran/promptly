// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { retireCarbonOwner } from '../e2e/carbon-owner';

let directory;
const executable = '/owned test/CarbonControl.app/Contents/MacOS/carbon-control';

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'promptly-carbon-owner-test-'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

test.each(['0', '-1', '42\nprivate', '2147483648'])(
  'invalid sidecar %s never observes or signals',
  async (value) => {
    await writeFile(path.join(directory, 'owner.pid'), value);
    const observe = vi.fn();
    const signal = vi.fn();

    expect(
      await retireCarbonOwner(executable, directory, 'ctrl-option-f11', observe, signal)
    ).toEqual({
      status: 'ownerUnavailable'
    });
    expect(observe).not.toHaveBeenCalled();
    expect(signal).not.toHaveBeenCalled();
  }
);

test.each(['ctrl-option-f11', 'ctrl-option-k'])(
  'exact executable, fresh directory and %s permit a signal followed by observed exit',
  async (chord) => {
    await writeFile(path.join(directory, 'owner.pid'), '42');
    const observe = vi
      .fn()
      .mockResolvedValueOnce(`${executable} ${directory} ${chord}`)
      .mockResolvedValueOnce(undefined);
    const signal = vi.fn();

    expect(await retireCarbonOwner(executable, directory, chord, observe, signal)).toEqual({
      status: 'exited',
      pid: 42
    });
    expect(observe.mock.calls).toEqual([[42], [42]]);
    expect(signal.mock.calls).toEqual([[42, 'SIGTERM']]);
  }
);

test.each(['different owned executable', `${executable} /different-launch-token`])(
  'stale owner sidecar cannot signal %s',
  async (actual) => {
    await writeFile(path.join(directory, 'owner.pid'), '42');
    const observe = vi.fn().mockResolvedValue(actual);
    const signal = vi.fn();

    expect(
      await retireCarbonOwner(executable, directory, 'ctrl-option-f11', observe, signal)
    ).toEqual({
      status: 'identityChanged',
      pid: 42
    });
    expect(signal).not.toHaveBeenCalled();
  }
);

test('identity changes after the first signal are never signaled again', async () => {
  await writeFile(path.join(directory, 'owner.pid'), '42');
  const observe = vi
    .fn()
    .mockResolvedValueOnce(`${executable} ${directory} ctrl-option-f11`)
    .mockResolvedValueOnce('other process');
  const signal = vi.fn();

  expect(
    await retireCarbonOwner(executable, directory, 'ctrl-option-f11', observe, signal)
  ).toEqual({
    status: 'identityChanged',
    pid: 42
  });
  expect(signal.mock.calls).toEqual([[42, 'SIGTERM']]);
});

test('an observation failure records no private command output and never signals', async () => {
  await writeFile(path.join(directory, 'owner.pid'), '42');
  const observe = vi.fn().mockRejectedValue(new Error('private command output'));
  const signal = vi.fn();
  const result = await retireCarbonOwner(executable, directory, 'ctrl-option-f11', observe, signal);

  expect(result).toEqual({ status: 'identityUnavailable', pid: 42 });
  expect(JSON.stringify(result)).not.toContain('private');
  expect(signal).not.toHaveBeenCalled();
});

test('failed signal is reported without claiming termination', async () => {
  await writeFile(path.join(directory, 'owner.pid'), '42');
  const observe = vi.fn().mockResolvedValue(`${executable} ${directory} ctrl-option-f11`);
  const signal = vi.fn(() => {
    throw new Error('owned fake refuses termination');
  });

  expect(
    await retireCarbonOwner(executable, directory, 'ctrl-option-f11', observe, signal)
  ).toEqual({
    status: 'signalFailed',
    pid: 42
  });
});

test.each(['ctrl-option-f11', 'ctrl-option-k'])(
  'a different allowlisted chord cannot authorize retirement of %s',
  async (chord) => {
    await writeFile(path.join(directory, 'owner.pid'), '42');
    const other = chord === 'ctrl-option-f11' ? 'ctrl-option-k' : 'ctrl-option-f11';
    const observe = vi.fn().mockResolvedValue(`${executable} ${directory} ${other}`);
    const signal = vi.fn();

    expect(await retireCarbonOwner(executable, directory, chord, observe, signal)).toEqual({
      status: 'identityChanged',
      pid: 42
    });
    expect(signal).not.toHaveBeenCalled();
  }
);
