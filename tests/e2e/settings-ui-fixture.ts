import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron, type ElectronApplication, expect } from '@playwright/test';

import { assertProfileIdentity } from '../profile-identity';
import { buildIpcFixture } from './build-ipc-fixture';
import { closeSettingsFixture } from './close-settings-fixture';

/** Real renderer, IPC, SQLite, lifecycle, theme and pin; only host login/Dock operations are substituted. */
export async function launchSettingsUiFixture(
  native = false,
  attachNativeReceipt?: (receipt: Buffer) => Promise<void>,
  storage = false
) {
  if (native && attachNativeReceipt === undefined)
    throw new Error('Native qualification requires a retained receipt destination.');
  await buildIpcFixture(undefined, 'tests/e2e/fixtures/settings-ui-main.ts', 'index', true);
  const profile = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-settings-ui-')));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined &&
        !['ELECTRON_RUN_AS_NODE', 'PROMPTLY_SETTINGS_UI_NATIVE'].includes(entry[0])
    )
  );

  env['PROMPTLY_SETTINGS_UI_PROFILE'] = profile;
  if (storage) env['PROMPTLY_STORAGE_UI'] = '1';
  if (native) env['PROMPTLY_SETTINGS_UI_NATIVE'] = '1';
  let application: ElectronApplication | undefined;
  const dispose = () =>
    closeSettingsFixture({
      close: () => application?.close() ?? Promise.resolve(),
      profile,
      native,
      ...(attachNativeReceipt === undefined ? {} : { retainReceipt: attachNativeReceipt })
    });

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
      profile,
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
