import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { fixtureLifecycle } from './fixture-lifecycle.mjs';
import { closeMacosOwner } from './fixture-macos-owner.mjs';
import { fixtureMetadata, metadataBytes } from './fixture-metadata.mjs';

export async function startMacosFixture(executable, mode) {
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-native-fixture-'));
  const readyFile = path.join(directory, 'ready.json');
  const bundle = path.join(path.dirname(executable), 'NativeFixture.app');
  // LaunchServices owns activation/registration of the unsigned controlled fixture.
  const launcher = spawn(
    '/usr/bin/open',
    ['-W', '-n', bundle, '--args', '--fixture', mode, readyFile],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const lifecycle = fixtureLifecycle(launcher, mode);
  const controller = new AbortController();
  let closing;
  const poll = (async () => {
    while (!controller.signal.aborted) {
      try {
        if ((await stat(readyFile)).size > metadataBytes) {
          lifecycle.fail('metadataTooLarge');
          return;
        }

        const metadata = fixtureMetadata(await readFile(readyFile, 'utf8'), undefined, true);
        const ownerPid = Number(await readFile(`${readyFile}.pid`, 'utf8'));

        if (ownerPid !== metadata.fixturePid) {
          lifecycle.fail('invalidMetadata');
          return;
        }

        lifecycle.accept(metadata);
        return;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          lifecycle.fail('invalidMetadata', error);
          return;
        }
      }

      await delay(100, undefined, { signal: controller.signal }).catch(() => {});
    }
  })();

  function close() {
    closing ??= (async () => {
      controller.abort();
      await poll;
      let owner;
      let launcherReceipt;

      try {
        owner = await closeMacosOwner(bundle, mode, readyFile);
      } finally {
        try {
          launcherReceipt = await lifecycle.close();
        } finally {
          await rm(directory, { recursive: true, force: true });
        }
      }

      if (owner.status !== 'exited') {
        const failure = new Error('Owned macOS fixture termination could not be verified');

        failure.receipt = { ...launcherReceipt, status: 'cleanupUnverified', owner };
        throw failure;
      }

      return { ...launcherReceipt, owner };
    })();
    return closing;
  }

  try {
    const metadata = await lifecycle.readiness;

    return {
      ...metadata,
      startupReceipt: lifecycle.receipt(),
      receipt: () => lifecycle.receipt(),
      close
    };
  } catch (error) {
    try {
      error.cleanup = await close();
    } catch (cleanupError) {
      error.cleanup = cleanupError.receipt ?? { status: 'cleanupFailed' };
    }

    throw error;
  } finally {
    controller.abort();
    await poll;
  }
}
