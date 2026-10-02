// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { retireSelectionOwner } from '../e2e/macos-fixture-owner';

let directory;
const executable = '/owned fixture/Contents/MacOS/selection-fixture';

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'promptly-source-owner-test-'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

test.each(['0', '-1', '42\nprivate', '2147483648'])(
  'invalid candidate %s cannot authorize a signal',
  async (text) => {
    await writeFile(path.join(directory, 'owner.pid'), text);
    const observe = vi.fn();
    const signal = vi.fn();

    await expect(
      retireSelectionOwner(executable, 'empty', directory, observe, signal)
    ).rejects.toThrow('Invalid owned selection fixture PID');
    expect(observe).not.toHaveBeenCalled();
    expect(signal).not.toHaveBeenCalled();
  }
);

test('fresh exact owned command is required before a signal, followed by observed exit', async () => {
  await writeFile(path.join(directory, 'owner.pid'), '42');
  const observe = vi
    .fn()
    .mockResolvedValueOnce(`${executable} empty ${directory}`)
    .mockResolvedValueOnce(undefined);
  const signal = vi.fn();

  await retireSelectionOwner(executable, 'empty', directory, observe, signal);
  expect(observe.mock.calls).toEqual([[42], [42]]);
  expect(signal.mock.calls).toEqual([[42, 'SIGTERM']]);
});

test.each([
  'foreign process',
  `${executable} empty /different-launch`,
  `${executable} selected /different-launch`
])('stale candidate identity is refused', async (command) => {
  await writeFile(path.join(directory, 'owner.pid'), '42');
  const observe = vi.fn().mockResolvedValue(command);
  const signal = vi.fn();

  await expect(
    retireSelectionOwner(executable, 'empty', directory, observe, signal)
  ).rejects.toThrow('identity changed');
  expect(signal).not.toHaveBeenCalled();
});

test('a failed signal alone never proves death', async () => {
  await writeFile(path.join(directory, 'owner.pid'), '42');
  const observe = vi.fn().mockResolvedValue(`${executable} empty ${directory}`);
  const signal = vi.fn(() => {
    throw new Error('owned fake kill failed');
  });

  await expect(
    retireSelectionOwner(executable, 'empty', directory, observe, signal)
  ).rejects.toThrow('signal failed');
  expect(observe).toHaveBeenCalledTimes(2);
});

test('signal racing with actual observed death succeeds safely', async () => {
  await writeFile(path.join(directory, 'owner.pid'), '42');
  const observe = vi
    .fn()
    .mockResolvedValueOnce(`${executable} empty ${directory}`)
    .mockResolvedValueOnce(undefined);
  const signal = vi.fn(() => {
    throw new Error('owned fake already gone');
  });

  await expect(
    retireSelectionOwner(executable, 'empty', directory, observe, signal)
  ).resolves.toBeUndefined();
});
