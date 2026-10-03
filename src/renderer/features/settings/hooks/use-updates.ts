import { useCallback, useEffect, useRef, useState } from 'react';

import type { UpdateState } from '../../../../shared/contracts/updates';

export function useUpdates(onFocus?: () => void) {
  const [state, setState] = useState<UpdateState>();
  const [error, setError] = useState<string>();
  const revision = useRef(-1);
  const focusRequest = useRef(0);
  const accept = useCallback(
    (next: UpdateState) => {
      if (next.revision < revision.current) return;
      revision.current = next.revision;
      setState(next);
      if (next.focusRequest > focusRequest.current) {
        focusRequest.current = next.focusRequest;
        onFocus?.();
      }
    },
    [onFocus]
  );

  useEffect(() => {
    let active = true;
    const stop = window.promptly.subscribeUpdates(accept);

    void window.promptly.getUpdateState({}).then((result) => {
      if (!active) return;
      if (result.ok) accept(result.value);
      else setError(result.error.message);
    });
    return () => {
      active = false;
      stop();
    };
  }, [accept]);

  const act = async () => {
    setError(undefined);
    if (state?.status === 'ready') {
      const restarted = await window.promptly.restartForUpdate({});

      if (!restarted.ok) setError(restarted.error.message);
      return;
    }

    const result = await (state?.status === 'available'
      ? window.promptly.installUpdate({})
      : window.promptly.checkForUpdates({}));

    if (result.ok) accept(result.value);
    else setError(result.error.message);
  };

  return { state, error, act };
}
