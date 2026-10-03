import { EventEmitter } from 'node:events';

import type { BrowserWindowConstructorOptions, MessageBoxOptions } from 'electron';

import type { Rectangle } from './geometry';
let nextContentsId = 1;

class ControlledContents extends EventEmitter {
  readonly id = nextContentsId++;
  readonly mainFrame = { url: '' };
  destroyed = false;
  messages: string[] = [];
  sent: { channel: string; payload: unknown }[] = [];
  isDestroyed = () => this.destroyed;
  setWindowOpenHandler = () => undefined;
  send = (channel: string, payload?: unknown) => {
    this.messages.push(channel);
    this.sent.push({ channel, payload });
  };
}

/** Controlled Electron boundary: internal lifecycle, registry and persistence remain real. */
export class ControlledWindow extends EventEmitter {
  static readonly instances: ControlledWindow[] = [];
  private readonly contents = new ControlledContents();
  visible = false;
  focused = false;
  minimized = false;
  destroyed = false;
  bounds: Rectangle;

  constructor(options: BrowserWindowConstructorOptions) {
    super();
    this.bounds = {
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: options.width ?? 440,
      height: options.height ?? 560
    };
    ControlledWindow.instances.push(this);
  }

  get webContents(): ControlledContents {
    if (this.destroyed) throw new TypeError('Object has been destroyed');
    return this.contents;
  }

  isDestroyed = () => this.destroyed;
  isVisible = () => this.visible;
  isFocused = () => this.focused;
  isMinimized = () => this.minimized;
  isFullScreen = () => false;
  isMaximized = () => false;
  getNormalBounds = () => ({ ...this.bounds });
  setMaximumSize = () => undefined;
  setMinimumSize = () => undefined;
  setTitleBarOverlay = () => undefined;
  setBounds = (bounds: Rectangle) => {
    this.bounds = bounds;
  };
  show = () => {
    this.visible = true;
  };
  focus = () => {
    this.focused = true;
  };
  hide = () => {
    this.visible = false;
    this.focused = false;
  };
  minimize = () => {
    this.minimized = true;
    this.focused = false;
  };
  restore = () => {
    this.minimized = false;
  };
  close = () => {
    let prevented = false;
    const isPrevented = () => prevented;

    this.emit('close', {
      preventDefault: () => {
        prevented = true;
      }
    });
    if (!isPrevented()) this.destroy();
  };
  destroy = () => {
    this.destroyed = true;
    this.visible = false;
    this.contents.destroyed = true;
    this.contents.emit('destroyed');
    this.emit('closed');
    if (ControlledWindow.instances.every((window) => window.isDestroyed()))
      desktopBoundary.app.emit('window-all-closed');
  };
  loadURL = (url: string) => {
    this.webContents.mainFrame.url = url;
    queueMicrotask(() => this.emit('ready-to-show'));
    return Promise.resolve();
  };
}

const screen = Object.assign(new EventEmitter(), {
  getPrimaryDisplay: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }),
  getAllDisplays: () => [{ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }]
});
const session = {
  setPermissionRequestHandler: () => undefined,
  setPermissionCheckHandler: () => undefined,
  protocol: { handle: () => undefined }
};

export const notices: MessageBoxOptions[] = [];
let answer: ((response: number) => void) | undefined;

export function answerDialog(response: number): void {
  answer?.(response);
}

export const desktopBoundary = {
  BrowserWindow: ControlledWindow,
  app: Object.assign(new EventEmitter(), {
    quitting: false,
    quit: () => {
      desktopBoundary.app.quitting = true;
      desktopBoundary.app.emit('before-quit');
    },
    isAccessibilitySupportEnabled: () => true
  }),
  screen,
  nativeTheme: { shouldUseDarkColors: false, themeSource: 'system' },
  session: { fromPartition: () => session },
  net: { fetch: () => Promise.resolve(new Response('')) },
  dialog: {
    showMessageBox: (first: ControlledWindow | MessageBoxOptions, second?: MessageBoxOptions) => {
      if (first instanceof ControlledWindow && second === undefined)
        throw new Error('Missing dialog options.');
      const options: MessageBoxOptions = second ?? (first as MessageBoxOptions);

      notices.push(options);
      return new Promise<{ response: number }>((resolve) => {
        answer = (response) => {
          resolve({ response });
        };

        options.signal?.addEventListener(
          'abort',
          () => {
            resolve({ response: options.cancelId ?? 0 });
          },
          { once: true }
        );
      });
    }
  }
};
