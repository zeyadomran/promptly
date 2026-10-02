import { fixtureStages } from './fixture-stages.mjs';
import { terminateChild } from './fixture-termination.mjs';

/** Owns child event settlement and retains counts/codes rather than output text. */
export function fixtureLifecycle(child, mode) {
  const started = performance.now();
  const markers = fixtureStages(() => performance.now() - started);
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let stage = 'readiness';
  let settled = false;
  let finishReady;
  let rejectReady;
  let finishClose;
  let closing;
  let errorCode = null;
  const closed = new Promise((resolve) => {
    finishClose = resolve;
  });
  const readiness = new Promise((resolve, reject) => {
    finishReady = resolve;
    rejectReady = reject;
  });
  const timer = setTimeout(() => fail('timedOut'), 5000);

  function receipt(status = stage) {
    return {
      stage,
      mode,
      status,
      elapsedMs: performance.now() - started,
      pid: child.pid ?? null,
      exitCode: child.exitCode,
      signal: child.signalCode,
      errorCode,
      stdoutBytes,
      stderrBytes,
      startupStages: markers.snapshot()
    };
  }

  function fail(status, error) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    errorCode =
      typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : null;
    const diagnostic = receipt(status);
    const failure = new Error(`Native fixture lifecycle: ${JSON.stringify(diagnostic)}`);

    failure.receipt = diagnostic;
    rejectReady(failure);
  }

  const countStdout = (chunk) => {
    stdoutBytes += chunk.length;
  };

  const countStderr = (chunk) => {
    stderrBytes += chunk.length;
    markers.read(chunk);
  };

  const streamError = (error) => fail('streamFailed', error);
  const childError = (error) => fail('spawnFailed', error);
  const childExit = () => fail('exited');

  child.stdout.on('data', countStdout);
  child.stderr.on('data', countStderr);
  child.stdout.on('error', streamError);
  child.stderr.on('error', streamError);
  child.on('error', childError);
  child.on('exit', childExit);
  child.once('close', () => {
    fail('exited');
    finishClose();
    child.stdout.off('data', countStdout);
    child.stderr.off('data', countStderr);
    child.off('exit', childExit);
    // Inert error handlers remain on this owned child until collection: late errors
    // must not become uncaught exceptions after settlement.
  });
  void readiness.catch(() => {});

  return {
    readiness,
    get pending() {
      return !settled;
    },
    fail,
    receipt,
    accept(metadata) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stage = 'ready';
      finishReady(metadata);
    },
    close() {
      closing ??= (async () => {
        fail('terminated');
        stage = 'closing';
        const terminated = await terminateChild(child, closed);

        stage = 'closed';
        if (!terminated) {
          const failure = new Error('Owned native fixture termination was not observed');

          failure.receipt = receipt('cleanupTimedOut');
          throw failure;
        }

        return receipt('closed');
      })();
      return closing;
    }
  };
}
