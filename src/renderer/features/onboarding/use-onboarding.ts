import { useCallback, useEffect, useRef, useState } from 'react';

import type { OnboardingState, OnboardingStep } from '../../../shared/contracts/onboarding';

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const live = useRef(false);
  const busy = useRef(false);
  const latest = useRef(-1);
  const receive = useCallback((next: OnboardingState) => {
    if (!live.current || next.version < latest.current) return;
    latest.current = next.version;
    setState(next);
  }, []);

  useEffect(() => {
    live.current = true;
    const stop = window.promptlyOnboarding.subscribe(receive);

    void window.promptly.getOnboardingState({}).then((result) => {
      if (!live.current) return;
      if (result.ok) receive(result.value);
      else setError(result.error.message);
    });
    return () => {
      live.current = false;
      stop();
    };
  }, [receive]);

  const act = async (step: OnboardingStep | boolean) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const result =
        typeof step === 'boolean'
          ? await window.promptly.finishOnboarding({ skip: step })
          : await window.promptly.setOnboardingStep({ step });

      if (!live.current) return;
      if (result.ok) receive(result.value);
      else setError(result.error.message);
    } finally {
      busy.current = false;
      if (live.current) setPending(false);
    }
  };

  return { state, pending, error: error ?? state?.error, act };
}
