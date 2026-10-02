import { app } from 'electron';

/** The native Windows selection adapter resolves its packaged helper configuration at startup. */
export function selectionLaunchOptions() {
  return {
    resourcesPath: process.resourcesPath,
    packaged: app.isPackaged,
    applicationPath: app.getAppPath()
  };
}

export function observeSelectionStartup(ready: Promise<unknown>, platform: 'Windows') {
  void ready.catch(() => {
    console.warn(`${platform} selection helper unavailable`);
  });
}
