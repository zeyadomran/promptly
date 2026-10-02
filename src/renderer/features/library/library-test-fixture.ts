import type { ChangeEvent, SearchRequest, Snippet } from '../../../shared/contracts/domain';
import type { SearchPage } from '../../../shared/contracts/domain';
import type { DesktopResult } from '../../../shared/contracts/result';

export function libraryFixture(count = 1_000) {
  let listener: ((event: ChangeEvent) => void) | undefined;
  let revision = 1;
  let items = Array.from({ length: count }, (_, index): Snippet => ({
    id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    text: `Snippet ${String(index)}`,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    sourceApp: null,
    sourceAppId: null,
    tags: [],
    lastCopiedAt: null,
    copyCount: 0
  }));
  const requests: SearchRequest[] = [];
  const bridge = {
    searchSnippets: (request: SearchRequest): Promise<DesktopResult<SearchPage>> => {
      requests.push(request);
      const filtered = items.filter((item) => item.text.includes(request.query));

      return Promise.resolve({
        ok: true,
        value: {
          revision,
          items: filtered.slice(request.offset, request.offset + request.limit),
          total: filtered.length,
          offset: request.offset,
          hasMore: request.offset + request.limit < filtered.length
        }
      });
    },
    listTags: () => Promise.resolve({ ok: true as const, value: { revision, tags: [] } }),
    subscribeChanges: (receive: (event: ChangeEvent) => void) => {
      listener = receive;
      return () => {
        listener = undefined;
      };
    }
  };

  return {
    bridge,
    requests,
    items: () => items,
    change: (next: Snippet[], domains: ChangeEvent['domains'] = ['snippets']) => {
      items = next;
      revision += 1;
      listener?.({ revision, domains });
    }
  };
}

export async function settleLibrary(): Promise<void> {
  // The client queues IPC in microtasks, including multi-page reconciliation.
  for (let index = 0; index < 100; index += 1) await Promise.resolve();
}
