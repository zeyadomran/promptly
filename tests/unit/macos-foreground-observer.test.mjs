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

test.each([
  { matched: true, launchDateAvailable: true },
  { matched: true, launchDateAvailable: false },
  { matched: false, launchDateAvailable: false }
])('returns only fresh owned observer booleans %j', async (response) => {
  await writeFile(
    path.join(directory, 'foreground.json'),
    JSON.stringify({ matched: !response.matched, launchDateAvailable: true })
  );
  const observed = observeOwnedMacosForeground(directory, process.pid);

  await respond(JSON.stringify(response));
  expect(await observed).toEqual(response);
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

test.each([
  '{"private":"unrelated app"}',
  'private malformed contents',
  '{"matched":true,"launchDateAvailable":false,"name":"unrelated"}',
  '{"matched":true,"launchDateAvailable":"false"}'
])('rejects malformed or extra observer output without reproducing it', async (contents) => {
  const observed = observeOwnedMacosForeground(directory, process.pid);
  const rejected = expect(observed).rejects.toThrow('Invalid owned foreground response');

  await respond(contents);
  await rejected;
});
