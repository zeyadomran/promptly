import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useSearch } from '../../../src/renderer/features/search/hooks/use-search';
import { FixtureResult } from './FixtureResult';

/** Test-only input -> named IPC -> packaged worker -> real React DOM -> paint fixture. */
export function SearchFixture() {
  const [query, setQuery] = useState('');
  const inputAt = useRef<number | undefined>(undefined);
  const timings = useRef({ bridgeMs: 0, workerMs: 0, replyAt: 0 });
  const bridge = useMemo(
    () => ({
      searchSnippets: async (request: Parameters<typeof window.promptly.searchSnippets>[0]) => {
        const started = performance.now();
        const reply = await window.promptly.searchSnippets(request);

        timings.current = {
          bridgeMs: performance.now() - started,
          workerMs: reply.ok ? (reply.value.searchDurationMs ?? 0) : 0,
          replyAt: performance.now()
        };
        return reply;
      },
      subscribeChanges: (listener: Parameters<typeof window.promptly.subscribeChanges>[0]) =>
        window.promptly.subscribeChanges((change) => {
          inputAt.current = performance.now();
          setPaint(undefined);
          listener(change);
        })
    }),
    []
  );
  const requested = useMemo(
    () => ({ query, tagIds: [], untagged: false, sort: 'newest' as const, offset: 0, limit: 20 }),
    [query]
  );
  const state = useSearch(requested, bridge);
  const result = state?.request === requested ? state.result : undefined;
  const [paint, setPaint] = useState<{
    query: string;
    revision: number;
    ms: number;
    bridgeMs: number;
    workerMs: number;
    commitMs: number;
    paintWaitMs: number;
  }>();

  useLayoutEffect(() => {
    if (result?.ok !== true || inputAt.current === undefined) return;
    const started = inputAt.current;
    const committed = performance.now();
    let second = 0;
    const first = requestAnimationFrame(() => {
      // Between consecutive frame callbacks, Chromium paints the committed result DOM.
      second = requestAnimationFrame(() => {
        if (inputAt.current === started)
          setPaint({
            query,
            revision: result.value.revision,
            ms: performance.now() - started,
            bridgeMs: timings.current.bridgeMs,
            workerMs: timings.current.workerMs,
            commitMs: committed - timings.current.replyAt,
            paintWaitMs: performance.now() - committed
          });
      });
    });

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [result, query]);

  return (
    <main>
      <label>
        Search
        <input
          aria-label="Search"
          value={query}
          onChange={(event) => {
            inputAt.current = event.timeStamp;
            setPaint(undefined);
            setQuery(event.target.value);
          }}
        />
      </label>
      <output data-testid="ready">{result?.ok === true ? result.value.revision : 'waiting'}</output>
      <output data-testid="total">{result?.ok === true ? result.value.total : ''}</output>
      <output
        data-testid="paint"
        data-query={paint?.query}
        data-revision={paint?.revision}
        data-bridge-ms={paint?.bridgeMs}
        data-worker-ms={paint?.workerMs}
        data-commit-ms={paint?.commitMs}
        data-paint-wait-ms={paint?.paintWaitMs}
      >
        {paint?.ms}
      </output>
      {result?.ok === true ? <FixtureResult page={result.value} /> : result?.error.message}
    </main>
  );
}
