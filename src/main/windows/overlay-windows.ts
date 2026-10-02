import { app, BrowserWindow } from 'electron';

const overlays = new WeakSet<BrowserWindow>();

/** Overlays have their own transparency/topmost policy, independent of library pin/chrome. */
export function markOverlayWindow(window: BrowserWindow): void {
  overlays.add(window);
}

export function isOverlayWindow(window: BrowserWindow): boolean {
  return overlays.has(window);
}

/** Preserve ordinary app closure semantics; an invisible overlay is not a recovery route. */
export function observeOrdinaryWindowClosure(): void {
  app.on('browser-window-created', (_event, window) => {
    window.once('closed', () => {
      if (isOverlayWindow(window)) return;
      const remaining = BrowserWindow.getAllWindows().filter(
        (candidate) => !candidate.isDestroyed()
      );

      // Leave genuine tray/background policy to the existing app handler. Zero windows emit natively.
      if (remaining.length > 0 && remaining.every(isOverlayWindow)) app.emit('window-all-closed');
    });
  });
}
