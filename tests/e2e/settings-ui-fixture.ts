import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron, type ElectronApplication, expect } from '@playwright/test';

import { assertProfileIdentity } from '../profile-identity';
import { buildIpcFixture } from './build-ipc-fixture';

/** Real renderer, IPC, SQLite, lifecycle, theme and pin; only host login/Dock operations are substituted. */
export async function launchSettingsUiFixture(
  native = false,
  attachNativeReceipt?: (receipt: Buffer) => Promise<void>
) {
  await buildIpcFixture(undefined, 'tests/e2e/fixtures/settings-ui-main.ts', true);
  const profile = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-settings-ui-')));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined &&
        !['ELECTRON_RUN_AS_NODE', 'PROMPTLY_SETTINGS_UI_NATIVE'].includes(entry[0])
    )
  );

  env['PROMPTLY_SETTINGS_UI_PROFILE'] = profile;
  if (native) env['PROMPTLY_SETTINGS_UI_NATIVE'] = '1';
  let application: ElectronApplication | undefined;
  const dispose = async () => {
    const failures: unknown[] = [];

    try {
      await application?.close();
    } catch (error) {
      failures.push(error);
    }

    try {
      if (native) {
        const receipt = await readFile(path.join(profile, 'native-preferences-restored.json'));

        // Preserve failure evidence before checking it or deleting this owned profile.
        await attachNativeReceipt?.(receipt);
        expect(JSON.parse(receipt.toString())).toMatchObject({ restorationOk: true });
      }
    } catch (error) {
      failures.push(error);
    } finally {
      await rm(profile, { recursive: true, force: true }).catch((error: unknown) => {
        failures.push(error);
      });
    }

    if (failures.length > 0) throw new AggregateError(failures, 'Owned Settings cleanup failed.');
  };

  const start = async () => {
    const instance = await electron.launch({
      args: [path.resolve('.vite/build/ipc-fixture.cjs')],
      env
    });

    application = instance;
    await expect.poll(() => instance.windows().length).toBe(2);
    await assertProfileIdentity(
      await instance.evaluate(({ app }) => app.getPath('userData')),
      profile
    );
    const main = instance.windows().find((page) => !page.url().endsWith('#settings'));
    const settings = instance.windows().find((page) => page.url().endsWith('#settings'));

    if (main === undefined || settings === undefined)
      throw new Error('Missing owned Settings fixture window.');
    await expect(settings.getByRole('tab', { name: 'General' })).toBeVisible();
    return { application: instance, main, settings };
  };

  try {
    const launched = await start();

    return {
      ...launched,
      restart: async () => {
        await application?.close();
        return start();
      },
      dispose
    };
  } catch (error) {
    try {
      await dispose();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Owned Settings startup and cleanup failed.',
        {
          cause: cleanupError
        }
      );
    }

    throw error;
  }
}

export function readOwnedNativePreferences(application: ElectronApplication) {
  return application.evaluate(
    ({ app }) =>
      new Promise<{ login: boolean; dock: boolean; profile: string }>((resolve) => {
        app.emit('owned-settings-receipt', resolve);
      })
  );
}

export function resizeSettings(application: ElectronApplication, width: number) {
  return application.evaluate(({ BrowserWindow }, next) => {
    const window = BrowserWindow.getAllWindows().find((item) =>
      item.webContents.getURL().endsWith('#settings')
    );

    if (window === undefined) throw new Error('Missing owned Settings window.');
    window.setContentSize(next, 640);
  }, width);
}
