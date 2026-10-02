import { spawn } from 'node:child_process';

import { observeElectronStartup } from './electron-startup-receipt';

async function within(closed: Promise<void>, milliseconds: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      closed.then(() => true),
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

function pidGone(pid: number | undefined): boolean {
  if (pid === undefined) return true;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'ESRCH';
  }
}

/** Observe from spawn, including an exit before Playwright could establish its connection. */
export async function observeStartupProcess(
  executable: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  deadlineMs = 20_000,
  cleanupMs = 2_000
) {
  const started = performance.now();
  const child = spawn(executable, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  const observation = observeElectronStartup(child, started);
  const failureState: { code: string | null } = { code: null };
  const error = (failure: NodeJS.ErrnoException) => {
    failureState.code =
      typeof failure.code === 'string' && /^[A-Z0-9_]+$/.test(failure.code) ? failure.code : null;
  };

  const closed = new Promise<void>((resolve) => {
    child.once('close', () => {
      resolve();
    });
  });

  child.on('error', error);
  child.stdout.on('error', error);
  child.stderr.on('error', error);
  observation.stage('spawn-observed');
  let forcedTermination = false;

  try {
    const exited = await within(closed, deadlineMs);

    if (!exited) {
      observation.stage('startup-deadline');
      forcedTermination = true;
      child.kill('SIGTERM');
      if (!(await within(closed, cleanupMs))) child.kill('SIGKILL');
    }

    const cleanupClosed = await within(closed, cleanupMs);

    observation.stage(cleanupClosed ? 'closed' : 'cleanup-deadline');
    return {
      ...observation.snapshot(),
      status: failureState.code !== null ? 'spawnFailed' : exited ? 'exited' : 'timedOut',
      errorCode: failureState.code,
      deadlineMs,
      cleanup: { closed: cleanupClosed, pidGone: pidGone(child.pid), forcedTermination }
    };
  } finally {
    observation.detach();
    // Inert error observers remain until collection; late errors never become uncaught.
  }
}
