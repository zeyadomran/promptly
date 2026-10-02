import { describe, expect, it, vi } from 'vitest';

import type { ChangeEvent, SearchPage, SearchRequest } from '../../shared/contracts/domain';
import type { DesktopResult } from '../../shared/contracts/result';
import { createSearchClient } from './desktop-client';

const request: SearchRequest = {
  query: '',
  tagIds: [],
  untagged: false,
  sort: 'newest',
  offset: 0,
  limit: 50
};

function page(revision: number): DesktopResult<SearchPage> {
  return { ok: true, value: { revision, items: [], total: 0, offset: 0, hasMore: false } };
}

function setup() {
  let listener: ((event: ChangeEvent) => void) | undefined;
  const unsubscribe = vi.fn();
  const fetch = vi.fn<(query: SearchRequest) => Promise<DesktopResult<SearchPage>>>();
  const receive = vi.fn();
  const client = createSearchClient(
    {
      searchSnippets: fetch,
      subscribeChanges: (callback) => {
        listener = callback;
        return unsubscribe;
      }
    },
    receive
  );

  return { client, fetch, receive, unsubscribe, emit: (event: ChangeEvent) => listener?.(event) };
}

describe('authoritative renderer queries', () => {
  it('coalesces a same-turn typing burst into one latest IPC without a timer', async () => {
    const { client, fetch, receive } = setup();

    fetch.mockResolvedValue(page(1));
    await Promise.all(['a', 'ab', 'abc'].map((query) => client.search({ ...request, query })));
    expect(fetch).toHaveBeenCalledExactlyOnceWith({ ...request, query: 'abc' });
    expect(receive).toHaveBeenCalledExactlyOnceWith(page(1), { ...request, query: 'abc' });
    client.dispose();
  });

  it('rejects late responses from previous search terms', async () => {
    const { client, fetch, receive } = setup();
    let finishFirst: ((value: DesktopResult<SearchPage>) => void) | undefined;

    fetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          })
      )
      .mockResolvedValueOnce(page(2));
    const first = client.search(request);

    await Promise.resolve();
    const second = client.search({ ...request, query: 'newer' });

    finishFirst?.(page(1));
    await Promise.all([first, second]);
    expect(receive).toHaveBeenCalledExactlyOnceWith(page(2), { ...request, query: 'newer' });
  });
  it('refetches on revisioned library changes and rejects old snapshots', async () => {
    const { client, fetch, receive, emit } = setup();

    fetch
      .mockResolvedValueOnce(page(0))
      .mockResolvedValueOnce(page(0))
      .mockResolvedValueOnce(page(4));
    await client.search(request);
    receive.mockClear();
    emit({ revision: 4, domains: ['snippets'] });
    await vi.waitFor(() => {
      expect(receive).toHaveBeenCalledExactlyOnceWith(page(4), request);
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    emit({ revision: 2, domains: ['snippets'] });
    expect(fetch).toHaveBeenCalledTimes(3);
    client.dispose();
  });
  it('disposes subscriptions and drops responses in flight', async () => {
    const { client, fetch, receive, unsubscribe } = setup();
    let finish: ((value: DesktopResult<SearchPage>) => void) | undefined;

    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = client.search(request);

    await Promise.resolve();

    client.dispose();
    client.dispose();
    finish?.(page(2));
    await pending;
    expect(receive).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
