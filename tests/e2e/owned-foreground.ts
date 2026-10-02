import { setTimeout as delay } from 'node:timers/promises';

import type {
  WindowsForegroundResult,
  WindowsIdentity
} from '../../src/main/platform/windows/windows-selection';

interface ReadinessObservation {
  status: WindowsForegroundResult['status'];
  owned: boolean;
  sourceAvailable: boolean;
  elapsedMs: number;
}

/** Fixture startup only: reads identity, never selected text or another app's PID/name. */
export async function waitOwnedForeground(
  read: () => Promise<WindowsForegroundResult>,
  isOwned: (identity: WindowsIdentity) => Promise<boolean>,
  observe: (value: ReadinessObservation) => void,
  deadlineMs = 15_000
): Promise<WindowsIdentity> {
  const started = performance.now();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const isStopped = () => stopped;
  const poll = async (): Promise<WindowsIdentity> => {
    while (!isStopped()) {
      const result = await read();
      const owned = result.status === 'ok' && (await isOwned(result.identity));

      if (isStopped()) break;
      observe({
        status: result.status,
        owned,
        sourceAvailable: result.status === 'ok' && result.identity.source !== null,
        elapsedMs: performance.now() - started
      });
      if (result.status === 'ok' && owned) return result.identity;
      await delay(50);
    }

    throw new Error('Owned foreground readiness stopped');
  };

  try {
    return await Promise.race([
      poll(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Owned foreground readiness timed out'));
        }, deadlineMs);
      })
    ]);
  } finally {
    stopped = true;
    clearTimeout(timer);
  }
}
