import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import readline from 'node:readline';

/** Only launches owned controls; never samples the user's current app. */
export async function windowsFixture(
  mode: string,
  arguments_: string[] = [],
  executable = 'fixture.exe'
) {
  const extensionless = executable === 'fixture-no-suffix';
  const child = spawn(
    path.resolve('tests/native/windows/out', extensionless ? 'fixture.exe' : executable),
    extensionless ? ['launch-extensionless'] : [mode, ...arguments_],
    {
      windowsHide: false,
      stdio: 'pipe'
    }
  );
  const lines = readline.createInterface({ input: child.stdout });
  let diagnostics = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let integrityLevel: number | null = null;

  child.stderr.on('data', (chunk: Buffer) => {
    diagnostics = (diagnostics + chunk.toString()).slice(-2048);
  });
  try {
    const fixturePid = await new Promise<number>((resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Owned fixture startup timed out (${mode}): ${diagnostics}`));
      }, 15_000);
      child.once('error', reject);
      child.once('exit', (code) => {
        reject(new Error(`Owned fixture exited (${mode}, ${String(code)}): ${diagnostics}`));
      });
      lines.once('line', (line) => {
        try {
          const value: unknown = JSON.parse(line);

          if (
            typeof value !== 'object' ||
            value === null ||
            !('fixturePid' in value) ||
            typeof value.fixturePid !== 'number' ||
            !Number.isInteger(value.fixturePid) ||
            value.fixturePid < 1 ||
            (extensionless
              ? !('launcherPid' in value) || value.launcherPid !== child.pid
              : value.fixturePid !== child.pid)
          )
            throw new Error('Invalid fixture readiness');
          if (
            !('integrityLevel' in value) ||
            (value.integrityLevel !== null &&
              (typeof value.integrityLevel !== 'number' ||
                !Number.isInteger(value.integrityLevel) ||
                value.integrityLevel < 0))
          )
            throw new Error('Invalid fixture integrity receipt');
          integrityLevel = value.integrityLevel;
          resolve(value.fixturePid);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Invalid fixture readiness'));
        }
      });
    });

    return {
      fixturePid,
      integrityLevel,
      close: async () => {
        lines.close();
        if (child.exitCode !== null || child.signalCode !== null) return;
        const exit = once(child, 'exit');

        if (extensionless) child.stdin.end();
        else child.kill();
        const watchdog = setTimeout(() => child.kill(), 5000);

        try {
          await exit;
        } finally {
          clearTimeout(watchdog);
        }
      }
    };
  } catch (error) {
    lines.close();
    if (extensionless) child.stdin.end();
    else child.kill();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
