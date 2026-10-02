import { cp, mkdir, mkdtemp, readFile, realpath, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createPackage, extractAll } from '@electron/asar';
import { _electron as electron, type ElectronApplication, expect, test } from '@playwright/test';

import { assertProfileIdentity } from '../profile-identity';
import { buildIpcFixture } from './build-ipc-fixture';
import { closeSettingsFixture } from './close-settings-fixture';
import { copyOwnedPackage } from './copy-package';
import { ensureNativeReceipt, retireNativeReceipt } from './native-restoration-receipt';
import { writeSettingsReceipt } from './settings-receipt';

/** Wrap a private package copy before production initialization; never modify the distributable. */
export async function launchOwnedTransferPackage() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-native-transfer-')));
  const profile = path.join(root, 'profile');
  const packageCopy = path.join(root, 'package');
  const source = path.join(root, 'source');

  await mkdir(profile);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE'
    )
  );

  env['PROMPTLY_SETTINGS_UI_PROFILE'] = profile;
  env['PROMPTLY_SETTINGS_UI_NATIVE'] = '1';
  let application: ElectronApplication | undefined;
  let stage = 'package-copy';
  const dispose = async () => {
    const failures: unknown[] = [];

    try {
      await writeSettingsReceipt(test.info(), 'packaged-transfer-stage', JSON.stringify({ stage }));
      const phase = await readFile(path.join(profile, 'native-transfer-phase.json')).catch(() =>
        Buffer.from('{"stage":"before-wrapper-ready"}')
      );

      await writeSettingsReceipt(test.info(), 'packaged-transfer-native-phase', phase);
      const initial = await readFile(path.join(profile, 'native-transfer-initial.json')).catch(() =>
        Buffer.from('{"status":"not-observed"}')
      );

      await writeSettingsReceipt(test.info(), 'packaged-transfer-initial', initial);
    } catch (error) {
      failures.push(error);
    }

    try {
      await closeSettingsFixture({
        close: async () => {
          try {
            await application?.close();
          } finally {
            await ensureNativeReceipt(profile, stage);
          }
        },
        profile,
        native: true,
        retainReceipt: (body) =>
          writeSettingsReceipt(test.info(), 'packaged-transfer-restoration', body)
      });
    } catch (error) {
      failures.push(error);
    } finally {
      await rm(root, { recursive: true, force: true }).catch((error: unknown) =>
        failures.push(error)
      );
    }

    if (failures.length > 0)
      throw new AggregateError(failures, 'Owned packaged transfer cleanup failed.');
  };

  const start = async () => {
    const executable =
      process.platform === 'darwin'
        ? path.join(packageCopy, 'Promptly.app', 'Contents', 'MacOS', 'Promptly')
        : path.join(packageCopy, 'Promptly.exe');

    stage = 'electron-launch';
    await retireNativeReceipt(profile);
    await rm(path.join(profile, 'native-transfer-initial.json'), { force: true });
    await rm(path.join(profile, 'native-transfer-phase.json'), { force: true });
    application = await electron.launch({ executablePath: executable, env, timeout: 20_000 });
    await application.firstWindow({ timeout: 20_000 });
    await assertProfileIdentity(
      await application.evaluate(({ app }) => app.getPath('userData')),
      profile
    );
    expect(await application.evaluate(({ app }) => app.isPackaged)).toBe(true);
    stage = 'ready';
    return application;
  };

  try {
    await copyOwnedPackage(
      path.resolve('out', `Promptly-${process.platform}-${process.arch}`),
      packageCopy
    );
    const resources =
      process.platform === 'darwin'
        ? path.join(packageCopy, 'Promptly.app', 'Contents', 'Resources')
        : path.join(packageCopy, 'resources');
    const archive = path.join(resources, 'app.asar');

    extractAll(archive, source);
    await rename(
      path.join(source, '.vite/build/main.cjs'),
      path.join(source, '.vite/build/production-main.cjs')
    );
    await buildIpcFixture(undefined, 'tests/e2e/fixtures/storage-native-wrapper.ts', true);
    await cp(
      path.resolve('.vite/build/ipc-fixture.cjs'),
      path.join(source, '.vite/build/main.cjs')
    );
    await createPackage(source, archive);
    const instance = await start();

    return {
      get application() {
        return application ?? instance;
      },
      profile,
      dispose,
      stage: (next: string) => {
        stage = next;
      },
      restart: async () => {
        await application?.close();
        const receipt = await readFile(path.join(profile, 'native-preferences-restored.json'));

        await writeSettingsReceipt(test.info(), 'packaged-transfer-restart-restoration', receipt);
        expect(JSON.parse(receipt.toString())).toMatchObject({ restorationOk: true });
        return start();
      }
    };
  } catch (primary) {
    const [cleanup] = await Promise.allSettled([dispose()]);

    if (cleanup.status === 'rejected') {
      throw new AggregateError(
        [primary, cleanup.reason],
        'Owned package startup and cleanup failed.',
        {
          cause: primary
        }
      );
    }

    throw primary;
  }
}
