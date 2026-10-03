import { existsSync } from 'node:fs';
import path from 'node:path';

import { app, autoUpdater, Notification } from 'electron';

import type { DesktopOperations } from '../../shared/contracts/operations';
import { updateChannel } from '../../shared/contracts/updates';
import type { WindowRegistry } from '../ipc/window-registry';
import type { WindowLifecycle } from '../windows/window-lifecycle';
import { findGithubRelease } from './github-release';
import { UpdateService } from './service';
import { applySquirrelUpdate } from './squirrel-updater';

export function createDesktopUpdates(
  getWindows: () => WindowRegistry | undefined,
  getLifecycle: () => WindowLifecycle | undefined
) {
  let notification: Notification | undefined;
  let startup: ReturnType<typeof setTimeout> | undefined;
  const updaterError = () => {
    console.warn('Unable to complete the Windows update.');
  };

  const service = new UpdateService({
    available:
      app.isPackaged &&
      existsSync(path.resolve(path.dirname(process.execPath), '..', 'Update.exe')),
    findRelease: () => findGithubRelease(app.getVersion()),
    apply: applySquirrelUpdate,
    restart: () => {
      autoUpdater.quitAndInstall();
    },
    publish: (state) => getWindows()?.broadcast(updateChannel, state, false),
    openSettings: async () => {
      await getLifecycle()?.show('settings');
    },
    notify: (version, open) => {
      if (!Notification.isSupported()) return;
      notification?.close();
      notification = new Notification({
        title: `Promptly ${version} is available`,
        body: 'Update now? Click to open Settings. You can update whenever you’re ready.'
      });
      notification.on('click', open);
      notification.on('failed', () => {
        console.warn('Update notification could not be shown.');
      });
      notification.show();
    }
  });
  const services: Pick<
    DesktopOperations,
    'getUpdateState' | 'checkForUpdates' | 'installUpdate' | 'restartForUpdate'
  > = {
    getUpdateState: () => Promise.resolve({ ok: true, value: service.state }),
    checkForUpdates: async () => ({ ok: true, value: await service.check() }),
    installUpdate: () => {
      void service.install();
      return Promise.resolve({ ok: true, value: service.state });
    },
    restartForUpdate: () => {
      service.restart();
      return Promise.resolve({ ok: true, value: {} });
    }
  };

  autoUpdater.on('error', updaterError);
  return {
    services,
    start: () => {
      // Squirrel holds an installation lock briefly on --squirrel-firstrun.
      startup = setTimeout(
        () => {
          void service.check(true);
        },
        process.argv.includes('--squirrel-firstrun') ? 10_000 : 0
      );
    },
    close: () => {
      clearTimeout(startup);
      service.close();
      notification?.close();
    }
  };
}
