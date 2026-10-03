import { autoUpdater } from 'electron';

import { releaseFeed } from './github-release';

/** Called only after explicit Update consent. Squirrel applies files before restart. */
// Electron 44's built-in AutoUpdater exposes no download-progress event on Windows.
// Keep progress absent so consumers show an indeterminate download, never a timer estimate.
export function applySquirrelUpdate(version: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      autoUpdater.removeListener('update-downloaded', downloaded);
      autoUpdater.removeListener('update-not-available', unavailable);
      autoUpdater.removeListener('error', failed);
      if (error === undefined) resolve();
      else reject(error);
    };

    const downloaded = () => {
      finish();
    };

    const unavailable = () => {
      finish(new Error('Release is no longer available.'));
    };

    const failed = (error: Error) => {
      finish(error);
    };

    autoUpdater.once('update-downloaded', downloaded);
    autoUpdater.once('update-not-available', unavailable);
    autoUpdater.once('error', failed);
    try {
      autoUpdater.setFeedURL({ url: releaseFeed(version) });
      autoUpdater.checkForUpdates();
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Update failed.'));
    }
  });
}
