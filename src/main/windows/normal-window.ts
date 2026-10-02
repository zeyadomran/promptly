import type { BrowserWindow } from 'electron';

/** Cocoa fullscreen exit is asynchronous; resizing before it completes loses final bounds. */
export async function restoreNormalWindow(window: BrowserWindow): Promise<void> {
  if (window.isFullScreen())
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        resolve();
      };

      const timer = setTimeout(() => {
        window.removeListener('leave-full-screen', done);
        reject(new Error('Unable to leave fullscreen. Reopen Promptly to recover.'));
      }, 5000);

      window.once('leave-full-screen', done);
      window.setFullScreen(false);
    });
  if (window.isMaximized()) window.unmaximize();
}
