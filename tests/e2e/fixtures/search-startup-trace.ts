import { EventEmitter } from 'node:events';

import { app, contentTracing, type IpcMain, ipcMain } from 'electron';

function record(event: string, detail: object = {}) {
  console.log(
    JSON.stringify({
      searchTrace: event,
      epochMs: performance.timeOrigin + performance.now(),
      ...detail
    })
  );
}

export function searchFixtureIpc(): IpcMain {
  if (process.env['PROMPTLY_SEARCH_TRACE'] !== '1') return ipcMain;
  const handle = ipcMain.handle.bind(ipcMain);

  ipcMain.handle = (channel, handler) => {
    handle(channel, async (event, ...args: unknown[]) => {
      record('main-ipc-received', { channel });
      const result: unknown = await handler(event, ...args);

      record('main-ipc-replied', { channel });
      return result;
    });
  };

  return ipcMain;
}

/** Fixture-only recording: bounded to ten seconds and 32 MiB, never a qualification run. */
export async function startSearchStartupTrace(): Promise<void> {
  const filename = process.env['PROMPTLY_SEARCH_TRACE_PATH'];

  if (process.env['PROMPTLY_SEARCH_TRACE'] !== '1' || filename === undefined) return;
  app.on('browser-window-created', (_event, window) => {
    const snapshot = () => ({
      visible: window.isVisible(),
      focused: window.isFocused(),
      minimized: window.isMinimized(),
      bounds: window.getContentBounds(),
      backgroundThrottling: window.webContents.getBackgroundThrottling()
    });

    record('window-created', snapshot());
    for (const event of ['show', 'hide', 'focus', 'blur', 'ready-to-show', 'resize'] as const)
      EventEmitter.prototype.on.call(window, event, () => {
        record(event, snapshot());
      });
    for (const event of ['did-start-loading', 'dom-ready', 'did-finish-load'] as const)
      EventEmitter.prototype.on.call(window.webContents, event, () => {
        record(event, snapshot());
      });
  });
  await contentTracing.startRecording({
    included_categories: [
      'toplevel',
      'blink.user_timing',
      'devtools.timeline',
      'cc',
      'viz',
      'gpu',
      'electron',
      'ipc',
      'mojom',
      'renderer.scheduler',
      'disabled-by-default-devtools.timeline.frame'
    ],
    excluded_categories: ['*'],
    recording_mode: 'record-continuously',
    trace_buffer_size_in_kb: 32768
  });
  record('recording-started');
  let stopped: Promise<string> | undefined;
  const stop = () => {
    clearTimeout(timeout);
    stopped ??= contentTracing.stopRecording(filename);
    return stopped;
  };

  EventEmitter.prototype.on.call(
    app,
    'search-fixture:stop-trace',
    (resolve: (file: string) => void, reject: (error: unknown) => void) => {
      void stop().then(resolve, reject);
    }
  );
  // Stop even if test assertions or renderer startup fail before the normal stop point.
  const timeout = setTimeout(() => {
    void stop().then(() => {
      record('recording-time-limit');
    }, console.error);
  }, 10_000).unref();
}
