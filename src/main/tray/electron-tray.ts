import path from 'node:path';

import {
  app,
  Menu,
  type MenuItemConstructorOptions,
  nativeImage,
  nativeTheme,
  Tray
} from 'electron';

import type { TrayItem, TrayNative } from './ports';

/** The taskbar theme follows Windows system UI, independently of the app theme setting. */
export function electronTray(onError: () => void): TrayNative {
  const directory = app.isPackaged
    ? path.join(process.resourcesPath, 'tray-assets')
    : path.join(app.getAppPath(), 'out', 'tray-assets');

  return {
    create: () => {
      let paused = false;
      let status = '';
      let menu: readonly TrayItem[] = [];
      const icon = () =>
        path.join(
          directory,
          `tray-${nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ? 'dark' : 'light'}${paused ? '-paused' : ''}.ico`
        );

      if (nativeImage.createFromPath(icon()).isEmpty())
        throw new Error('Tray icon is unavailable.');
      const tray = new Tray(icon());
      const update = () => {
        if (tray.isDestroyed()) return;
        tray.setImage(icon());
        tray.setToolTip(
          `Promptly${paused ? ' — Capture paused' : ''}${status ? ` — ${status}` : ''}`
        );
      };

      const changed = () => {
        try {
          update();
        } catch {
          onError();
        }
      };

      const invoke = (item: TrayItem | undefined) => {
        if (tray.isDestroyed() || item?.run === undefined) return;
        void Promise.resolve().then(item.run).catch(onError);
      };

      nativeTheme.on('updated', changed);
      tray.on('click', () => {
        invoke(menu.find((item) => item.label === 'Open Promptly'));
      });
      update();
      return {
        isDestroyed: () => tray.isDestroyed(),
        setMenu: (items) => {
          menu = items;
          tray.setContextMenu(
            Menu.buildFromTemplate(
              items.map<MenuItemConstructorOptions>((item) => ({
                // A display hint does not install another accelerator or intercept native input.
                label:
                  item.shortcut !== undefined && item.shortcut !== ''
                    ? `${item.label ?? ''}\t${item.shortcut}`
                    : (item.label ?? ''),
                type: item.type ?? 'normal',
                checked: item.checked ?? false,
                enabled: item.enabled ?? true,
                click: () => {
                  invoke(item);
                }
              }))
            )
          );
        },
        setPaused: (value) => {
          paused = value;
          update();
        },
        setStatus: (message) => {
          status = message;
          update();
        },
        destroy: () => {
          nativeTheme.removeListener('updated', changed);
          if (!tray.isDestroyed()) tray.destroy();
        }
      };
    }
  };
}
