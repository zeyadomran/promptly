import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';

export async function startFixture(executable, mode) {
  if (process.platform !== 'darwin') {
    const child = spawn(executable, ['--fixture', mode], {
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true
    });
    const lines = createInterface({ input: child.stdout });

    try {
      const [line] = await once(lines, 'line', { signal: AbortSignal.timeout(5000) });

      return {
        ...JSON.parse(line),
        async close() {
          lines.close();
          child.kill();
        }
      };
    } catch (error) {
      lines.close();
      child.kill();
      throw error;
    }
  }

  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-native-fixture-'));
  const readyFile = path.join(directory, 'ready.json');
  const bundle = path.join(path.dirname(executable), 'NativeFixture.app');
  // LaunchServices owns activation/registration of the unsigned controlled fixture.
  const launcher = spawn(
    '/usr/bin/open',
    ['-W', '-n', bundle, '--args', '--fixture', mode, readyFile],
    { stdio: 'ignore' }
  );
  let fixturePid;

  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      let metadata;

      try {
        metadata = JSON.parse(await readFile(readyFile, 'utf8'));
      } catch {
        await delay(100);
        continue;
      }

      fixturePid = metadata.fixturePid;

      return {
        ...metadata,
        async close() {
          try {
            process.kill(fixturePid);
          } catch {
            /* Fixture may have exited already. */
          }

          launcher.kill();
          await rm(directory, { recursive: true, force: true });
        }
      };
    }

    throw new Error('Controlled macOS fixture readiness timed out');
  } catch (error) {
    launcher.kill();
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
