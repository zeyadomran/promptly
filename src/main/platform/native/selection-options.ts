import { app } from 'electron';

/** Both native selection adapters resolve the same packaged helper configuration at startup. */
export function selectionLaunchOptions() {
  return {
    resourcesPath: process.resourcesPath,
    packaged: app.isPackaged,
    applicationPath: app.getAppPath()
  };
}

export function observeSelectionStartup(ready: Promise<unknown>, platform: 'macOS' | 'Windows') {
  void ready.catch(() => {
    console.warn(`${platform} selection helper unavailable`);
  });
}
