import { useEffect, useRef, useSyncExternalStore } from 'react';

import { actOnUpdate, getUpdateSnapshot, subscribeUpdates } from './updates-store';

/** One update stream per renderer, shared by the shell and About controls. */
export function useUpdates(onFocus?: () => void) {
  const snapshot = useSyncExternalStore(subscribeUpdates, getUpdateSnapshot);
  const focusRequest = useRef(0);
  const request = snapshot.state?.focusRequest ?? 0;

  useEffect(() => {
    if (onFocus === undefined || request <= focusRequest.current) return;
    focusRequest.current = request;
    onFocus();
  }, [onFocus, request]);

  return { ...snapshot, act: actOnUpdate };
}
