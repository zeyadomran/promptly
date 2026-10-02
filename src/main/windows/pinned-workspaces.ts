import type { BrowserWindow } from 'electron';

/** Dock settings own activation policy; workspace hints must never change that preference. */
export function setPinnedWorkspaces(
  window: Pick<BrowserWindow, 'setVisibleOnAllWorkspaces'>,
  pinned: boolean,
  platform: NodeJS.Platform = process.platform
): void {
  if (platform === 'darwin')
    window.setVisibleOnAllWorkspaces(pinned, {
      visibleOnFullScreen: pinned,
      skipTransformProcessType: true
    });
}
