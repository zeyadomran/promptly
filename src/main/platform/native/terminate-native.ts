import type { ChildProcessWithoutNullStreams } from 'node:child_process';

/** Keep Electron alive until EOF exit or watchdog termination is observed. */
export function terminateNative(child: ChildProcessWithoutNullStreams | undefined): Promise<void> {
  if (child?.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const watchdog = setTimeout(() => child.kill(), 250);
    const finished = () => {
      clearTimeout(watchdog);
      resolve();
    };

    child.once('exit', finished);
    child.once('error', finished);
    child.stdin.end();
  });
}
