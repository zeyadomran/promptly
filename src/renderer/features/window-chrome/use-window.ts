import { useEffect, useState } from 'react';

import type { WindowState } from '../../../shared/contracts/window';

/** Observe native state; the library command owner manages input focus. */
export function useWindow() {
  const [state, setState] = useState<WindowState>({
    kind: 'main',
    mode: window.promptlyInitialSettings?.settings.defaultSizeMode ?? 'compact',
    visible: true
  });
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const focus = () => {
      void window.promptly.getWindowState({}).then((result) => {
        if (active && result.ok) setState(result.value);
      });
    };

    focus();
    const unsubscribe = window.promptly.subscribeWindowFocus(focus);

    window.addEventListener('focus', focus);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('focus', focus);
    };
  }, []);
  return {
    ...state,
    error,
    setMode: async (mode: WindowState['mode']) => {
      const result = await window.promptly.setWindowMode({
        mode,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      });

      if (result.ok) {
        setState(result.value);
        setError(undefined);
      } else setError(result.error.message);
    }
  };
}
