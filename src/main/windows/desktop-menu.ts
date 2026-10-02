import { Menu } from 'electron';

import type { WindowLifecycle } from './window-lifecycle';

export function installDesktopMenu(
  open: () => void,
  lifecycle: () => WindowLifecycle | undefined
): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Promptly',
        submenu: [
          { label: 'Open Promptly', click: open },
          {
            label: 'Settings…',
            click: () => {
              void lifecycle()?.show('settings').catch(console.error);
            }
          },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      { role: 'editMenu' }
    ])
  );
}
