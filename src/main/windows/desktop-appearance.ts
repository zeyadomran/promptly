import { nativeTheme } from 'electron';

import { updateWindowBackgrounds } from '../settings/electron-controllers';
import { installDesktopMenu } from './desktop-menu';
import type { WindowLifecycle } from './window-lifecycle';

export function installDesktopAppearance(
  openWindow: () => void,
  lifecycle: () => WindowLifecycle | undefined
): void {
  installDesktopMenu(openWindow, lifecycle);
  nativeTheme.on('updated', updateWindowBackgrounds);
}
