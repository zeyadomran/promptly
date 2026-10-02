import { setTimeout as delay } from 'node:timers/promises';

async function observedWithin(closed, milliseconds) {
  const controller = new AbortController();

  try {
    return await Promise.race([
      closed.then(() => true),
      delay(milliseconds, false, { signal: controller.signal })
    ]);
  } finally {
    controller.abort();
  }
}

export async function terminateChild(child, closed) {
  if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined)
    return observedWithin(closed, 500);
  child.kill('SIGTERM');
  if (await observedWithin(closed, 500)) return true;
  child.kill('SIGKILL');
  return observedWithin(closed, 500);
}
