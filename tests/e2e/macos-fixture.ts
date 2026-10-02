import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import { ownedFixtureExit } from './macos-fixture-exit';
import { OwnedFixtureSetupError } from './macos-fixture-failure';
import { retireSelectionOwner } from './macos-fixture-owner';
import { yieldOwnedFixture } from './macos-fixture-yield';
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

/** Owned AppKit activation only. No user selection, input injection or TCC changes. */
export async function macosFixture(
  mode: string,
  launchMode: 'launchServices' | 'direct' = 'launchServices',
  coordinator?: { yieldTo: (ownedPid: number) => Promise<void> }
) {
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-owned-selection-')));
  const bundle = await realpath(path.resolve('tests/native/macos/out/SelectionFixture.app'));
  const executable = path.join(bundle, 'Contents/MacOS/selection-fixture');
  const child = spawn(
    launchMode === 'direct' ? executable : '/usr/bin/open',
    launchMode === 'direct'
      ? [mode, directory, ...(coordinator ? ['cooperative'] : [])]
      : ['-W', '-n', bundle, '--args', mode, directory],
    { stdio: 'ignore' }
  );
  const lifetime = ownedFixtureExit(child);
  let state: FixtureState | undefined;
  let closing: Promise<Awaited<ReturnType<typeof lifetime.close>>> | undefined;
  const closeOnce = async () => {
    const observed = await lifetime.close(
      () => writeFile(path.join(directory, 'stop'), ''),
      launchMode === 'launchServices'
        ? () => retireSelectionOwner(executable, mode, directory)
        : undefined
    );

    await rm(directory, { recursive: true, force: true });
    return observed;
  };

  const close = () => {
    closing ??= closeOnce();
    return closing;
  };

  try {
    if (coordinator) {
      if (launchMode !== 'direct' || child.pid === undefined)
        throw new Error('Missing owned direct cooperative process');
      // Native startup installs its file loop before the coordinator yields.
      const initialized = await readState(path.join(directory, 'initialized.json'));

      if (initialized.fixturePid !== child.pid)
        throw new Error('Owned cooperative process PID mismatch');
      if (lifetime.hasExited()) throw new Error('Owned cooperative target already exited');
      await coordinator.yieldTo(child.pid);
      await writeFile(path.join(directory, 'activate'), '');
    }

    state = await readState(path.join(directory, 'ready.json'));
    if (launchMode === 'direct' && state.fixturePid !== child.pid)
      throw new Error('Owned direct process PID mismatch');
    return {
      ...state,
      close,
      yieldTo: (ownedPid: number) => yieldOwnedFixture(directory, ownedPid),
      hasExited: lifetime.hasExited,
      isForeground: (ownedPid: number) => observeOwnedMacosForeground(directory, ownedPid),
      inspect: async () => {
        if (lifetime.hasExited()) throw new Error('Owned fixture has exited');
        await rm(path.join(directory, 'state.json'), { force: true });
        await writeFile(path.join(directory, 'inspect'), '');
        return readState(path.join(directory, 'state.json'));
      }
    };
  } catch (error) {
    throw new OwnedFixtureSetupError(error, await Promise.allSettled([close()]));
  }
}

export const macosResources = () =>
  path.resolve('out', `Promptly-darwin-${process.arch}`, 'Promptly.app', 'Contents', 'Resources');
