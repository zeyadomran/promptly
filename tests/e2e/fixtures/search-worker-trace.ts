import type { StorageBoundaryObserver } from '../../../src/main/storage/worker-diagnostics';

/** Owned fixture only: at most 512 content-free boundary events over ten seconds. */
export function searchWorkerTrace(): StorageBoundaryObserver | undefined {
  if (process.env['PROMPTLY_SEARCH_TRACE'] !== '1') return undefined;
  return (event) => {
    // StorageClient invokes this only on final flush, after every measured result paint.
    console.log(JSON.stringify({ searchTrace: 'storage-boundary', ...event }));
  };
}
