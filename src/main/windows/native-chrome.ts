import { type BrowserWindow, nativeTheme } from 'electron';

const chromeWindows = new WeakSet<BrowserWindow>();

/** Keep the native caption palette aligned with the renderer's background/foreground tokens. */
export function nativeChromeColors() {
  return nativeTheme.shouldUseDarkColors
    ? { color: '#09090b', symbolColor: '#fafafa' }
    : { color: '#ffffff', symbolColor: '#09090b' };
}

export function registerNativeChrome(window: BrowserWindow): void {
  chromeWindows.add(window);
}

export function updateNativeChrome(window: BrowserWindow): void {
  if (chromeWindows.has(window)) window.setTitleBarOverlay(nativeChromeColors());
}
