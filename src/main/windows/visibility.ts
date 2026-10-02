import type { BrowserWindow } from 'electron';

/** P24/P07 inject actual native registrations; requested settings never imply availability. */
export interface WindowRecovery {
  trayAvailable: () => boolean;
  trayControllerAvailable?: () => boolean;
  shortcutAvailable: () => boolean;
  dockAvailable: () => boolean;
}

export function canRecover(recovery: WindowRecovery): boolean {
  return recovery.trayAvailable() || recovery.shortcutAvailable() || recovery.dockAvailable();
}

export function concealWindow(
  window: Pick<BrowserWindow, 'hide' | 'minimize' | 'show'>,
  recovery: WindowRecovery,
  platform: NodeJS.Platform = process.platform
): void {
  if (canRecover(recovery)) window.hide();
  else if (platform === 'darwin') window.show();
  else window.minimize();
}
