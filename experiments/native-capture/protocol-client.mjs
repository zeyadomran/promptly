import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

export function openHelper(executable) {
  const child = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const pending = new Map();
  let sequence = 0;
  const lines = createInterface({ input: child.stdout });

  lines.on('line', (line) => {
    if (line.length > 2097152) {
      child.kill();
      return;
    }

    const response = JSON.parse(line);
    const waiter = pending.get(response.id);

    if (waiter) {
      clearTimeout(waiter.timer);
      pending.delete(response.id);
      waiter.resolve(response);
    }
  });
  child.on('exit', () => {
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('Native helper exited'));
    }

    pending.clear();
  });
  child.on('error', () => {
    for (const waiter of pending.values())
      waiter.reject(new Error('Native helper failed to start'));
  });
  // Do not print helper output: a production capture may include private selection text.
  child.stderr.resume();

  return {
    async request(command, options = {}) {
      const id = String(++sequence);

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          child.kill();
          reject(new Error(`Native command timed out: ${command}`));
        }, 2000);

        pending.set(id, { resolve, reject, timer });
        child.stdin.write(`${JSON.stringify({ v: 1, id, command, ...options })}\n`);
      });
    },
    async close() {
      const exited = once(child, 'exit');

      try {
        await this.request('stop');
      } finally {
        child.stdin.end();
      }

      await exited;
    },
    kill() {
      child.kill();
    }
  };
}
