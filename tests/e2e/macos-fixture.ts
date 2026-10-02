import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import { observeOwnedMacosForeground } from './macos-foreground-observer';

export const buildMacosFixture = () =>
  promisify(execFile)('sh', [path.resolve('tests/native/macos/build.sh')]);
interface FixtureState {
  fixturePid: number;
  foregroundMatched: boolean;
  selectionLocation: number;
  selectionLength: number;
  pasteboardChangeCount: number;
}
async function readState(filename: string): Promise<FixtureState> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const value: unknown = JSON.parse(await readFile(filename, 'utf8'));

      if (
        typeof value !== 'object' ||
        value === null ||
        !('fixturePid' in value) ||
        typeof value.fixturePid !== 'number' ||
        !Number.isInteger(value.fixturePid) ||
        value.fixturePid < 1 ||
        !('foregroundMatched' in value) ||
        typeof value.foregroundMatched !== 'boolean' ||
        !('selectionLocation' in value) ||
        typeof value.selectionLocation !== 'number' ||
        !('selectionLength' in value) ||
        typeof value.selectionLength !== 'number' ||
        !('pasteboardChangeCount' in value) ||
        typeof value.pasteboardChangeCount !== 'number'
      ) {
        throw new Error('Invalid owned fixture metadata');
      }

      return value as FixtureState;
    } catch {
      await delay(100);
    }
  }

  throw new Error('Owned macOS fixture readiness timed out');
}

/** LaunchServices owns fixture activation. No user selection, input injection, TCC changes. */
export async function macosFixture(mode: string) {
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-owned-selection-'));
  const child = spawn(
    '/usr/bin/open',
    [
      '-W',
      '-n',
      path.resolve('tests/native/macos/out/SelectionFixture.app'),
      '--args',
      mode,
      directory
    ],
    { stdio: 'ignore' }
  );
  const exited = once(child, 'exit');
  let state: FixtureState | undefined;
  let closing: Promise<void> | undefined;
  const closeOnce = async () => {
    await writeFile(path.join(directory, 'stop'), '');
    const timeout = setTimeout(() => {
      child.kill();
    }, 5000);

    try {
      await Promise.race([exited, delay(5500)]);
    } finally {
      clearTimeout(timeout);
      // Only our own PID from an owned metadata directory, after graceful shutdown failed.
      if (state !== undefined && child.exitCode === null) {
        try {
          process.kill(state.fixturePid);
        } catch {
          /* Already exited. */
        }
      }

      child.kill();
      await rm(directory, { recursive: true, force: true });
    }
  };

  const close = () => {
    closing ??= closeOnce();
    return closing;
  };

  try {
    state = await readState(path.join(directory, 'ready.json'));
    return {
      ...state,
      close,
      isForeground: (ownedPid: number) => observeOwnedMacosForeground(directory, ownedPid),
      inspect: async () => {
        await rm(path.join(directory, 'state.json'), { force: true });
        await writeFile(path.join(directory, 'inspect'), '');
        return readState(path.join(directory, 'state.json'));
      }
    };
  } catch (error) {
    await close();
    throw error;
  }
}

export const macosResources = () =>
  path.resolve('out', `Promptly-darwin-${process.arch}`, 'Promptly.app', 'Contents', 'Resources');
