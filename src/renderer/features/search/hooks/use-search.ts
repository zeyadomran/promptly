import { useEffect, useRef, useState } from 'react';

import type { DesktopBridge } from '../../../../shared/contracts/desktop-bridge';
import type { SearchPage, SearchRequest } from '../../../../shared/contracts/domain';
import type { DesktopResult } from '../../../../shared/contracts/result';
import { createSearchClient } from '../../../lib/desktop-client';

/** One active IPC plus one latest queued request; no timed input debounce. */
export function useSearch(
  request: SearchRequest,
  bridge: Pick<DesktopBridge, 'searchSnippets' | 'subscribeChanges'> = window.promptly
) {
  const [state, setState] = useState<{
    result: DesktopResult<SearchPage>;
    request: SearchRequest;
  }>();
  const client = useRef<ReturnType<typeof createSearchClient> | undefined>(undefined);

  useEffect(() => {
    const active = createSearchClient(bridge, (result, completed) => {
      setState({ result, request: completed });
    });

    client.current = active;
    return () => {
      active.dispose();
      client.current = undefined;
    };
  }, [bridge]);
  useEffect(() => {
    void client.current?.search(request);
  }, [request, bridge]);

  return state;
}
