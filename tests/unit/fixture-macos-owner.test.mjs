// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { closeMacosOwner } from '../../experiments/native-capture/fixture-macos-owner.mjs';

let directory;
let readyFile;
const bundle = path.resolve('owned fixture/NativeFixture.app');

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'promptly-owner-regression-'));
  readyFile = path.join(directory, 'ready.json');
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

test('a stale sidecar never authorizes signaling a different live process', async () => {
  await writeFile(`${readyFile}.pid`, '42');
  const execute = vi.fn(async () => ({ stdout: 'unrelated owned test process' }));
  const kill = vi.fn();

  expect(await closeMacosOwner(bundle, 'selected', readyFile, { execute, kill })).toEqual({
    pid: 42,
    status: 'identityChanged'
  });
  expect(kill).not.toHaveBeenCalled();
  expect(execute.mock.calls[0][1]).toEqual(['-ww', '-p', '42', '-o', 'command=']);
});

test('the exact executable and fresh launch path authorize one signal then observed exit', async () => {
  await writeFile(`${readyFile}.pid`, '42');
  const expected = `${path.join(bundle, 'Contents/MacOS/promptly-native')} --fixture selected ${readyFile}`;
  const execute = vi
    .fn()
    .mockResolvedValueOnce({ stdout: expected })
    .mockRejectedValueOnce({ code: 1 });
  const kill = vi.fn();

  expect(await closeMacosOwner(bundle, 'selected', readyFile, { execute, kill })).toEqual({
    pid: 42,
    status: 'exited'
  });
  expect(kill.mock.calls).toEqual([[42, 'SIGTERM']]);
});

test.each(['0', '-1', '42\nprivate', '2147483648'])(
  'invalid candidate %s causes no process observation or signal',
  async (value) => {
    await writeFile(`${readyFile}.pid`, value);
    const execute = vi.fn();
    const kill = vi.fn();

    expect(await closeMacosOwner(bundle, 'selected', readyFile, { execute, kill })).toEqual({
      status: 'ownerUnavailable'
    });
    expect(execute).not.toHaveBeenCalled();
    expect(kill).not.toHaveBeenCalled();
  }
);

test('observation failure retains only safe status and never signals a candidate', async () => {
  await writeFile(`${readyFile}.pid`, '42');
  const execute = vi.fn().mockRejectedValue({ code: 'ETIMEDOUT', stderr: 'private output' });
  const kill = vi.fn();
  const result = await closeMacosOwner(bundle, 'selected', readyFile, { execute, kill });

  expect(result).toEqual({ pid: 42, status: 'identityUnavailable' });
  expect(kill).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain('private');
});
