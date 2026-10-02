import type { DesktopBridge } from '../../shared/contracts/desktop-bridge';
import type { SearchPage, SearchRequest } from '../../shared/contracts/domain';
import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';

/** Owns transient queries only; desktop services own the authoritative library. */
export function createSearchClient(
  bridge: Pick<DesktopBridge, 'searchSnippets' | 'subscribeChanges'>,
  receive: (result: DesktopResult<SearchPage>, request: SearchRequest) => void
) {
  let query: SearchRequest | undefined;
  let requestVersion = 0;
  let knownRevision = 0;
  let disposed = false;
  let running = false;
  let queued = false;
  let scheduled = false;
  let waiters: (() => void)[] = [];

  async function refetch(retry = true): Promise<void> {
    if (query === undefined || disposed) return;
    const version = ++requestVersion;
    const result = await bridge.searchSnippets(query);

    if (version !== requestVersion) return;
    if (result.ok && result.value.revision < knownRevision) {
      // A query racing a commit may observe an old snapshot; never display it.
      if (retry) await refetch(false);
      else
        receive(failure('UNAVAILABLE', 'The library changed. Please try the search again.'), query);
      return;
    }

    if (result.ok) knownRevision = Math.max(knownRevision, result.value.revision);
    receive(result, query);
  }

  async function drain(): Promise<void> {
    scheduled = false;
    if (running || disposed) return;
    running = true;
    try {
      while (queued) {
        queued = false;
        await refetch();
      }
    } finally {
      running = false;
      for (const resolve of waiters) resolve();
      waiters = [];
    }
  }

  function schedule(): void {
    queued = true;
    // Supersede the active result immediately, even before the next IPC begins.
    requestVersion += 1;
    if (scheduled || running || disposed) return;
    scheduled = true;
    queueMicrotask(() => {
      void drain();
    });
  }

  const unsubscribe = bridge.subscribeChanges((event) => {
    if (event.revision < knownRevision) return;
    knownRevision = event.revision;
    if (event.domains.includes('snippets') || event.domains.includes('tags')) schedule();
  });

  return {
    search: (request: SearchRequest): Promise<void> => {
      query = request;
      if (disposed) return Promise.resolve();
      const settled = new Promise<void>((resolve) => {
        waiters.push(resolve);
      });

      schedule();
      return settled;
    },
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      queued = false;
      requestVersion += 1;
      unsubscribe();
      for (const resolve of waiters) resolve();
      waiters = [];
    }
  };
}
