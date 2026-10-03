import type { ShortcutStatus } from '../../shared/contracts/shortcuts';
import type { TrayItem } from './ports';

export function trayOpenItem(items: readonly TrayItem[]): TrayItem | undefined {
  return items.find((item) => item.command === 'open');
}

export function trayMenu(
  recent: TrayItem[],
  shortcuts: ShortcutStatus,
  commands: {
    open: (kind: 'main' | 'settings') => Promise<void>;
    pause: () => Promise<void>;
    updateReady: () => boolean;
    restartForUpdate: () => void;
    quit: () => void;
  }
): TrayItem[] {
  return [
    { label: 'Recent', enabled: false },
    ...recent,
    { type: 'separator' },
    {
      command: 'open',
      label: 'Open Promptly',
      shortcut: shortcuts.labels.open,
      run: () => commands.open('main')
    },
    { label: shortcuts.capturePaused ? 'Resume capture' : 'Pause capture', run: commands.pause },
    { label: 'Settings', run: () => commands.open('settings') },
    ...(commands.updateReady()
      ? [
          {
            label: 'Restart to update',
            run: () => {
              if (commands.updateReady()) commands.restartForUpdate();
              return Promise.resolve();
            }
          }
        ]
      : []),
    { type: 'separator' },
    {
      label: 'Quit Promptly',
      run: () => {
        commands.quit();
        return Promise.resolve();
      }
    }
  ];
}
