import { type BrowserWindow, nativeTheme } from 'electron';

const chromeWindows = new WeakSet<BrowserWindow>();

export function registerNativeChrome(window: BrowserWindow): void {
  chromeWindows.add(window);
}

export function updateNativeChrome(window: BrowserWindow): void {
  if (process.platform === 'win32' && chromeWindows.has(window))
    window.setTitleBarOverlay({
      color: nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff',
      symbolColor: nativeTheme.shouldUseDarkColors ? '#fafafa' : '#18181b'
    });
}
