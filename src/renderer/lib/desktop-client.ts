import type { DesktopBridge } from '../../shared/contracts/desktop-bridge';
import type { SearchPage, SearchRequest } from '../../shared/contracts/domain';
import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';

/** Owns transient queries only; desktop services own the authoritative library. */
export function createSearchClient(
  bridge: Pick<DesktopBridge, 'searchSnippets' | 'subscribeChanges'>,
  receive: (result: DesktopResult<SearchPage>) => void
) {
  let query: SearchRequest | undefined;
  let requestVersion = 0;
  let knownRevision = 0;
  let disposed = false;

  async function refetch(retry = true): Promise<void> {
    if (query === undefined || disposed) return;
    const version = ++requestVersion;
    const result = await bridge.searchSnippets(query);

    if (version !== requestVersion) return;
    if (result.ok && result.value.revision < knownRevision) {
      // A query racing a commit may observe an old snapshot; never display it.
      if (retry) await refetch(false);
      else receive(failure('UNAVAILABLE', 'The library changed. Please try the search again.'));
      return;
    }

    if (result.ok) knownRevision = Math.max(knownRevision, result.value.revision);
    receive(result);
  }

  const unsubscribe = bridge.subscribeChanges((event) => {
    if (event.revision < knownRevision) return;
    knownRevision = event.revision;
    if (event.domains.includes('snippets') || event.domains.includes('tags')) void refetch();
  });

  return {
    search: async (request: SearchRequest): Promise<void> => {
      query = request;
      await refetch();
    },
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      requestVersion += 1;
      unsubscribe();
    }
  };
}
