import type { BrowserWindow } from 'electron';

/** Both loading and painting must succeed; terminal events release the lifecycle's pending open. */
export function loadWindowRenderer(window: BrowserWindow, url: string, deadlineMs = 15_000) {
  return new Promise<void>((resolve, reject) => {
    let loaded = false;
    let ready = false;
    let settled = false;
    const contents = window.webContents;
    const complete = (error?: Error) => {
      if (settled) return;
      if (error === undefined && (!loaded || !ready)) return;
      settled = true;
      clearTimeout(timer);
      window.removeListener('ready-to-show', painted);
      window.removeListener('closed', closed);
      contents.removeListener('destroyed', destroyed);
      contents.removeListener('render-process-gone', exited);
      if (error === undefined) resolve();
      else reject(error);
    };

    const painted = () => {
      ready = true;
      complete();
    };

    const closed = () => {
      complete(new Error('Window closed before initialization completed.'));
    };

    const destroyed = () => {
      complete(new Error('Renderer destroyed before initialization completed.'));
    };

    const exited = () => {
      complete(new Error('Renderer exited before initialization completed.'));
    };

    const failed = (error: unknown) => {
      complete(error instanceof Error ? error : new Error('Unable to load window renderer.'));
    };

    const timer = setTimeout(() => {
      complete(new Error('Window initialization timed out.'));
    }, deadlineMs);

    window.on('ready-to-show', painted);
    window.on('closed', closed);
    contents.on('destroyed', destroyed);
    contents.on('render-process-gone', exited);
    try {
      void window.loadURL(url).then(() => {
        loaded = true;
        complete();
      }, failed);
    } catch (error) {
      failed(error);
    }
  });
}
