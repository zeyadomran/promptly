import type { BrowserWindow } from 'electron';

/** P24/P07 inject actual native registrations; requested settings never imply availability. */
export interface WindowRecovery {
  trayAvailable: () => boolean;
  trayControllerAvailable?: () => boolean;
  shortcutAvailable: () => boolean;
}

export function canRecover(recovery: WindowRecovery): boolean {
  return recovery.trayAvailable() || recovery.shortcutAvailable();
}

export function concealWindow(
  window: Pick<BrowserWindow, 'hide' | 'minimize'>,
  recovery: WindowRecovery
): void {
  if (canRecover(recovery)) window.hide();
  else window.minimize();
}
