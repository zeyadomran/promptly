import type { ChildProcess } from 'node:child_process';

const markers = {
  initializationFailed: 'Unable to initialize Promptly:',
  windowFailed: 'Unable to open Promptly:',
  cleanupFailed: 'Unable to close desktop services:',
  storageTimedOut: 'Local storage worker timed out.',
  nativeUnavailable: 'Windows selection helper unavailable'
};

/** Observe only the owned child's counters and known fixed diagnostics; no raw output. */
export function observeElectronStartup(child: ChildProcess, started: number) {
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let tail = '';
  const signals = new Set<string>();
  const stages: { stage: string; elapsedMs: number }[] = [];
  const stdout = (chunk: Buffer) => {
    stdoutBytes += Buffer.byteLength(chunk);
  };

  const stderr = (chunk: Buffer) => {
    stderrBytes += Buffer.byteLength(chunk);
    tail = (tail + chunk.toString()).slice(-4096);
    for (const [kind, prefix] of Object.entries(markers))
      if (tail.includes(prefix)) signals.add(kind);
  };

  child.stdout?.on('data', stdout);
  child.stderr?.on('data', stderr);
  return {
    stage: (stage: string) => {
      stages.push({ stage, elapsedMs: performance.now() - started });
    },
    snapshot: () => ({
      elapsedMs: performance.now() - started,
      pid: child.pid ?? null,
      exitCode: child.exitCode,
      signal: child.signalCode,
      stdoutBytes,
      stderrBytes,
      signals: [...signals],
      stages: [...stages]
    }),
    detach: () => {
      child.stdout?.off('data', stdout);
      child.stderr?.off('data', stderr);
      tail = '';
    }
  };
}
