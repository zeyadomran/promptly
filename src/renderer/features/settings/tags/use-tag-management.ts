import { useCallback, useEffect, useRef, useState } from 'react';

import type { TagSummary } from '../../../../shared/contracts/domain';
import type { DesktopResult } from '../../../../shared/contracts/result';

export function useTagManagement() {
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [readError, setReadError] = useState<string>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const active = useRef(false);
  const busy = useRef(false);
  const uncertain = useRef(false);
  const readVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++readVersion.current;

    try {
      const result = await window.promptly.listTags({});

      if (!active.current || version !== readVersion.current) return;
      if (!result.ok) {
        setReadError(result.error.message);
        return;
      }

      setTags(result.value.tags);
      setLoaded(true);
      setReadError(undefined);
      uncertain.current = false;
      setBlocked(false);
    } catch {
      if (active.current && version === readVersion.current)
        setReadError('Unable to load tags. Refresh to try again.');
    }
  }, []);

  useEffect(() => {
    active.current = true;
    queueMicrotask(() => {
      if (active.current) void refresh();
    });
    const requests = readVersion;
    const unsubscribe = window.promptly.subscribeChanges((event) => {
      if (event.domains.includes('tags')) void refresh();
    });

    return () => {
      active.current = false;
      requests.current++;
      unsubscribe();
    };
  }, [refresh]);

  const run = async <T>(
    action: () => Promise<DesktopResult<T>>,
    notice: string,
    conflictMessage?: string
  ) => {
    if (busy.current || uncertain.current) return false;
    busy.current = true;
    setPending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await action();

      if (!active.current) return result.ok;
      if (!result.ok) {
        setError(
          result.error.code === 'CONFLICT' && conflictMessage !== undefined
            ? conflictMessage
            : result.error.message
        );
        if (result.error.code === 'NOT_FOUND') await refresh();
        return false;
      }

      setMessage(notice);
      await refresh();
      return true;
    } catch {
      if (active.current) {
        readVersion.current++;
        uncertain.current = true;
        setBlocked(true);
        setError(
          'Unable to confirm this change. Refresh the tag list before making another change.'
        );
      }

      return true;
    } finally {
      busy.current = false;
      if (active.current) setPending(false);
    }
  };

  const begin = () => {
    setError(undefined);
    setMessage(undefined);
  };

  return {
    tags,
    loaded,
    pending,
    blocked,
    readError,
    error,
    message,
    refresh,
    run,
    begin,
    notify: setMessage
  };
}
