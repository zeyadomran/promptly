import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import path from 'node:path';

import { type HookFrame, hookFrameSchema } from '../../../shared/contracts/shortcuts';
import { terminateNative } from '../native/terminate-native';

export interface HookHealth {
  installed: boolean;
  accessibility: boolean | null;
  inputMonitoring: boolean | null;
}
export interface KeyboardHook {
  readonly health: HookHealth;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/** Dedicated sanitized event pipe. It never shares a selection-request worker. */
export class NativeKeyboardHook implements KeyboardHook {
  private child: ChildProcessWithoutNullStreams | undefined;
  private starting: Promise<void> | undefined;
  private readonly retiring = new Set<Promise<void>>();
  private current: HookHealth = { installed: false, accessibility: null, inputMonitoring: null };

  constructor(
    private readonly launch: () => ChildProcessWithoutNullStreams,
    private readonly receive: (frame: HookFrame) => void
  ) {}

  get health(): HookHealth {
    return { ...this.current };
  }

  start(): Promise<void> {
    if (this.starting !== undefined) return this.starting;
    if (this.child !== undefined) return Promise.resolve();
    const startup = new Promise<void>((resolve) => {
      let buffer = Buffer.alloc(0);
      let ready = false;
      let lastTime = 0;
      let offset = 0;
      let child: ChildProcessWithoutNullStreams;
      const failed = () => {
        clearTimeout(timer);
        if (this.child === child) {
          this.current.installed = false;
          this.child = undefined;
          this.receive({ kind: 'reset', timeMs: 0 });
          this.retire(child);
        }

        resolve();
      };

      try {
        child = this.launch();
      } catch {
        resolve();
        return;
      }

      this.child = child;
      const timer = setTimeout(failed, 1500);

      child.stderr.resume();
      child.stdin.on('error', failed);
      child.on('error', failed);
      child.on('exit', failed);
      child.stdout.on('end', failed);
      child.stdout.on('data', (chunk: Buffer) => {
        if (this.child !== child) return;
        try {
          buffer = Buffer.concat([buffer, chunk]);
          if (buffer.length > 16_384) throw new Error('Oversized keyboard output');
          let newline = buffer.indexOf(10);

          while (newline >= 0) {
            if (newline > 1024) throw new Error('Oversized keyboard frame');
            const frame = hookFrameSchema.parse(
              JSON.parse(buffer.subarray(0, newline).toString('utf8')) as unknown
            );

            buffer = buffer.subarray(newline + 1);
            if (!ready) {
              if (frame.kind !== 'ready') throw new Error('Keyboard readiness missing');
              ready = true;
              offset = performance.now() - frame.timeMs;
              this.current = {
                installed: frame.installed,
                accessibility: frame.accessibility,
                inputMonitoring: frame.inputMonitoring
              };
              clearTimeout(timer);
              resolve();
            } else if (frame.kind === 'ready') throw new Error('Duplicate keyboard readiness');
            if (frame.timeMs < lastTime || performance.now() - offset - frame.timeMs > 600) {
              this.receive({ kind: 'reset', timeMs: frame.timeMs });
            } else this.receive(frame);
            lastTime = frame.timeMs;
            if (frame.kind === 'reset') this.current.installed = false;
            newline = buffer.indexOf(10);
          }

          if (buffer.length > 1024) throw new Error('Oversized partial keyboard frame');
        } catch {
          failed();
        }
      });
    });

    this.starting = startup.finally(() => {
      this.starting = undefined;
    });
    return this.starting;
  }

  async stop(): Promise<void> {
    const child = this.child;

    this.child = undefined;
    this.current.installed = false;
    this.receive({ kind: 'reset', timeMs: 0 });
    this.retire(child);
    await Promise.all(this.retiring);
  }

  private retire(child: ChildProcessWithoutNullStreams | undefined): void {
    const closing = terminateNative(child);

    this.retiring.add(closing);
    void closing.finally(() => {
      this.retiring.delete(closing);
    });
  }
}

export function keyboardExecutable(
  resourcesPath: string,
  applicationPath: string,
  packaged: boolean,
  platform: NodeJS.Platform
): string {
  const name = platform === 'win32' ? 'promptly-keyboard.exe' : 'promptly-keyboard';

  return packaged
    ? path.join(resourcesPath, name)
    : path.join(
        applicationPath,
        'native',
        'keyboard',
        platform === 'win32' ? 'windows' : 'macos',
        'out',
        name
      );
}

export function launchKeyboard(executable: string): ChildProcessWithoutNullStreams {
  return spawn(executable, [], { stdio: 'pipe', windowsHide: true });
}
