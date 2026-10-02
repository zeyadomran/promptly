import type { StorageBoundaryObserver } from '../../../src/main/storage/worker-diagnostics';

/** Owned fixture only: at most 512 content-free boundary events over ten seconds. */
export function searchWorkerTrace(): StorageBoundaryObserver | undefined {
  if (process.env['PROMPTLY_SEARCH_TRACE'] !== '1') return undefined;
  const deadline = performance.now() + 10_000;
  let remaining = 512;

  return (event) => {
    if (remaining <= 0 || performance.now() > deadline) return;
    remaining -= 1;
    console.log(JSON.stringify({ searchTrace: 'storage-boundary', ...event }));
  };
}
