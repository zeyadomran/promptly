// @vitest-environment node
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { observeOwnedMacosForeground } from '../e2e/macos-foreground-observer';

let directory;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'promptly-observer-regression-'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function respond(contents) {
  await vi.waitFor(async () => {
    expect(await readFile(path.join(directory, 'foreground-request'), 'utf8')).toBe(
      String(process.pid)
    );
  });
  const pending = path.join(directory, 'response.pending');

  await writeFile(pending, contents);
  await rename(pending, path.join(directory, 'foreground.json'));
}

test.each([true, false])('returns only the fresh owned observer match %s', async (matched) => {
  await writeFile(path.join(directory, 'foreground.json'), JSON.stringify(!matched));
  const observed = observeOwnedMacosForeground(directory, process.pid);

  await respond(JSON.stringify(matched));
  expect(await observed).toBe(matched);
});

test.each([0, -1, 1.5, 2147483648])(
  'rejects invalid owned PID %s before signaling',
  async (pid) => {
    await expect(observeOwnedMacosForeground(directory, pid)).rejects.toThrow(
      'Invalid owned foreground PID'
    );
    await expect(readFile(path.join(directory, 'foreground-request'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
  }
);

test.each(['{"private":"unrelated app"}', 'private malformed contents'])(
  'rejects nonboolean observer output without reproducing it',
  async (contents) => {
    const observed = observeOwnedMacosForeground(directory, process.pid);
    const rejected = expect(observed).rejects.toThrow('Invalid owned foreground response');

    await respond(contents);
    await rejected;
  }
);
