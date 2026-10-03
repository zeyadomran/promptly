import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  OnboardingDestination,
  OnboardingState,
  OnboardingStep
} from '../../../shared/contracts/onboarding';
import type { DesktopResult } from '../../../shared/contracts/result';

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

    void window.promptly
      .getOnboardingState({})
      .then((result) => {
        if (!live.current) return;
        if (result.ok) receive(result.value);
        else setError(result.error.message);
      })
      .catch(() => {
        if (live.current) setError('Unable to read setup status. Reopen Promptly to try again.');
      });
    return () => {
      live.current = false;
      stop();
    };
  }, [receive]);

  const perform = useCallback(
    async (request: () => Promise<DesktopResult<OnboardingState>>) => {
      if (busy.current) return;
      busy.current = true;
      setPending(true);
      setError(undefined);
      try {
        const result = await request();

        if (!live.current) return;
        if (result.ok) receive(result.value);
        else setError(result.error.message);
      } catch {
        if (live.current) setError('Unable to change setup. Try again.');
      } finally {
        busy.current = false;
        if (live.current) setPending(false);
      }
    },
    [receive]
  );
  const act = useCallback(
    (step: OnboardingStep) => perform(() => window.promptly.setOnboardingStep({ step })),
    [perform]
  );
  const finish = useCallback(
    (skip: boolean, destination: OnboardingDestination = 'library') =>
      perform(() => window.promptly.finishOnboarding({ skip, destination })),
    [perform]
  );

  return { state, pending, error: error ?? state?.error, act, finish };
}
