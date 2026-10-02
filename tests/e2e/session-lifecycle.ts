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

/** Only this directly spawned child handle may receive bounded fallback signals. */
export function sessionLifetime(child: ChildProcess) {
  let observedExit = false;
  let exitCode: number | null = null;
  let signal: NodeJS.Signals | null = null;
  let failed = false;
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
    child.on('error', () => {
      failed = true;
    });
  });

  return {
    stopped: () => observedExit || failed,
    close(requestStop: () => Promise<void>) {
      closing ??= (async () => {
        const errors: unknown[] = [];
        const stopped = Promise.resolve()
          .then(requestStop)
          .catch((error: unknown) => {
            errors.push(error);
          });

        if (!failed)
          await within(
            Promise.all([exited, stopped]).then(() => undefined),
            500
          );
        if (!observedExit && child.pid !== undefined) {
          try {
            child.kill('SIGTERM');
          } catch (error) {
            errors.push(error);
          }

          if (!(await within(exited, 500))) {
            try {
              child.kill('SIGKILL');
            } catch (error) {
              errors.push(error);
            }

            await within(exited, 500);
          }
        }

        if (!observedExit) throw new Error('Owned session sidecar exit was not observed');
        if (errors.length) throw new AggregateError(errors, 'Owned session cleanup failed');
        return { observedExit: true as const, exitCode, signal };
      })();
      return closing;
    }
  };
}
