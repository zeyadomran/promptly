import { app } from 'electron';

import type { CopyService } from '../copy/service';
import type { Shortcuts } from '../shortcuts/service';
import type { StorageClient } from '../storage/client';
import type { WindowLifecycle } from '../windows/window-lifecycle';
import { TrayCoordinator } from './coordinator';
import { electronTray } from './electron-tray';

/** Created before Settings initialization; commands resolve the current library/window owners. */
export function createDesktopTray(
  storage: StorageClient,
  shortcuts: Shortcuts,
  copy: () => CopyService | undefined,
  lifecycle: () => WindowLifecycle | undefined,
  updates: { ready: () => boolean; restart: () => void }
) {
  const error = () => {
    console.warn('Windows tray command unavailable.');
  };

  return new TrayCoordinator(storage, shortcuts, electronTray(error), {
    copy,
    updateReady: updates.ready,
    restartForUpdate: updates.restart,
    open: async (kind) => {
      const windows = lifecycle();

      if (windows === undefined) throw new Error('Library is not ready.');
      await windows.show(kind);
    },
    recover: async () => {
      await lifecycle()?.show();
    },
    quit: () => {
      app.quit();
    },
    error
  });
}
