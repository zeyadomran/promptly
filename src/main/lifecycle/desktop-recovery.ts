import { app, dialog } from 'electron';

import { createFailureRecovery } from './failure-recovery';

export function desktopRecovery(stopCommands: () => void, fatal: () => void) {
  return createFailureRecovery({
    directory: () => app.getPath('userData'),
    stopCommands,
    show: async (notice) => {
      const result = await dialog.showMessageBox({
        type: 'error',
        ...notice,
        buttons: ['Restart Promptly', 'Quit'],
        defaultId: 1,
        cancelId: 1,
        noLink: true
      });

      return result.response === 0 ? 'restart' : 'quit';
    },
    fallback: (notice) => {
      dialog.showErrorBox(notice.title, `${notice.message}\n\n${notice.detail}`);
    },
    relaunch: () => {
      app.relaunch();
    },
    fatal
  });
}
