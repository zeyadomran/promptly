import type { ChildProcess } from 'node:child_process';

async function within(exited: Promise<void>, milliseconds: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      exited.then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          resolve(false);
        }, milliseconds);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Register before readiness: a resolved timeout or a sent signal is never death proof. */
export function ownedFixtureExit(child: ChildProcess) {
  let observedExit = false;
  let spawnFailed = false;
  let exitCode: number | null = null;
  let signal: NodeJS.Signals | null = null;
  let closing:
    | Promise<{ observedExit: true; exitCode: number | null; signal: NodeJS.Signals | null }>
    | undefined;
  const exited = new Promise<void>((resolve) => {
    child.once('exit', (code, value) => {
      observedExit = true;
      exitCode = code;
      signal = value;
      resolve();
    });
    // A spawn error is handled, but is not an observed exit of a launched source.
    child.on('error', () => {
      spawnFailed = true;
    });
  });

  return {
    hasExited: () => observedExit,
    close(requestStop: () => Promise<void>, retireNative?: () => Promise<void>) {
      closing ??= (async () => {
        const failures: unknown[] = [];

        await requestStop().catch((error: unknown) => {
          failures.push(error);
        });
        if (!spawnFailed) await within(exited, 5000);
        // LaunchServices owners need an independent live-identity/exit check.
        await retireNative?.().catch((error: unknown) => {
          failures.push(error);
        });
        if (!observedExit && child.pid !== undefined) {
          child.kill('SIGTERM');
          if (!(await within(exited, 500))) {
            child.kill('SIGKILL');
            await within(exited, 500);
          }
        }

        if (!observedExit) throw new Error('Owned selection fixture exit was not observed');
        if (failures.length) throw new AggregateError(failures, 'Owned fixture cleanup failed');
        return { observedExit: true as const, exitCode, signal };
      })();
      return closing;
    }
  };
}
