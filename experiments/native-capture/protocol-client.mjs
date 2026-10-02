import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import { frameBytes } from './protocol-limits.mjs';

export function openHelper(executable, args = [], deadlines = {}) {
  const started = performance.now();
  const startupDeadlineMs = deadlines.startupDeadlineMs ?? 5000;
  const requestDeadlineMs = deadlines.requestDeadlineMs ?? 2000;
  const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const pending = new Map();
  const lines = createInterface({ input: child.stdout });
  let sequence = 0;
  let terminal = false;
  let stderrBytes = 0;
  let stdoutBytes = 0;
  let startupReceipt;
  let finishExit;
  const exited = new Promise((resolve) => {
    finishExit = resolve;
  });

  function receipt(phase, status) {
    return {
      phase,
      status,
      elapsedMs: performance.now() - started,
      pid: child.pid ?? null,
      exitCode: child.exitCode,
      signal: child.signalCode,
      stderrBytes,
      stdoutBytes
    };
  }

  function fail(phase, status) {
    if (terminal) return;
    terminal = true;
    const diagnostic = receipt(phase, status);

    if (phase === 'startup') startupReceipt = diagnostic;
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(`Native helper lifecycle: ${JSON.stringify(diagnostic)}`));
    }

    pending.clear();
    child.kill();
  }

  lines.on('line', (line) => {
    const phase = startupReceipt === undefined ? 'startup' : 'request';

    if (Buffer.byteLength(line, 'utf8') > frameBytes) return fail(phase, 'frameTooLarge');
    try {
      const response = JSON.parse(line);
      const waiter = pending.get(response.id);

      if (waiter) {
        clearTimeout(waiter.timer);
        pending.delete(response.id);
        waiter.resolve(response);
      }
    } catch {
      fail(phase, 'invalidResponse');
    }
  });
  child.stdout.on('data', (chunk) => {
    stdoutBytes += chunk.length;
  });
  // Retain only byte counts, never helper output or selection text.
  child.stderr.on('data', (chunk) => {
    stderrBytes += chunk.length;
  });
  child.on('exit', () => {
    fail(startupReceipt === undefined ? 'startup' : 'request', 'exited');
    lines.close();
    finishExit();
  });
  child.on('error', () => {
    fail('startup', 'spawnFailed');
    lines.close();
    finishExit();
  });
  child.stdin.on('error', () => {
    fail('request', 'writeFailed');
  });

  function send(command, options, deadlineMs, phase) {
    if (terminal) return Promise.reject(new Error('Native helper already exited'));
    const id = String(++sequence);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        fail(phase, 'timedOut');
      }, deadlineMs);

      pending.set(id, { resolve, reject, timer });
      child.stdin.write(`${JSON.stringify({ v: 1, id, command, ...options })}\n`);
    });
  }

  const startup = send('capabilities', {}, startupDeadlineMs, 'startup').then((response) => {
    if (response.status !== 'ok') {
      fail('startup', 'readinessFailed');
      throw new Error('Native helper readiness failed');
    }

    startupReceipt = receipt('startup', 'ready');
    return response;
  });

  // Callers may await readiness later; an early exit must not create an unhandled rejection.
  void startup.catch(() => {});

  return {
    ready() {
      return startup;
    },
    get startupReceipt() {
      return startupReceipt;
    },
    async request(command, options = {}) {
      await startup;
      return send(command, options, requestDeadlineMs, 'request');
    },
    async close() {
      if (!terminal) {
        try {
          await this.request('stop');
        } finally {
          child.stdin.end();
        }
      }

      await exited;
    },
    kill() {
      fail(startupReceipt === undefined ? 'startup' : 'request', 'terminated');
    }
  };
}
