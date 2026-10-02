import { useEffect, useRef } from 'react';

import type { OnboardingState, OnboardingStep } from '../../../shared/contracts/onboarding';
import { useShortcutPreferences } from '../shortcuts/hooks/use-shortcut-preferences';
import { useShortcutRecording } from '../shortcuts/hooks/use-shortcut-recording';
import { OnboardingFooter } from './OnboardingFooter';
import { OnboardingStepper } from './OnboardingStepper';
import { ShortcutStep } from './ShortcutStep';
import { TryCaptureStep } from './TryCaptureStep';
import { useOnboarding } from './use-onboarding';
import { WelcomeStep } from './WelcomeStep';

const initial: OnboardingState = {
  version: 0,
  step: 'welcome',
  saved: false,
  completed: false,
  error: null
};

export function OnboardingWindow() {
  const { state, pending, error, act } = useOnboarding();
  const recording = useShortcutRecording();
  const preferences = useShortcutPreferences();
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    content.current?.querySelector('h1')?.focus();
  }, [state?.step]);
  const navigate = (next: OnboardingStep | boolean) => {
    void recording.session.cancel().then(() => act(next));
  };

  return (
    <div className="onboarding-window">
      <OnboardingStepper step={state?.step ?? 'welcome'} />
      <main className="onboarding-main">
        <div className="onboarding-content" ref={content} aria-busy={pending}>
          <span className="onboarding-eyebrow">
            Step {state?.step === 'capture' ? 3 : state?.step === 'shortcut' ? 2 : 1} of 3
          </span>
          {state === undefined ? (
            <p role="status">Loading setup…</p>
          ) : state.step === 'welcome' ? (
            <WelcomeStep />
          ) : state.step === 'shortcut' ? (
            <ShortcutStep recording={recording} preferences={preferences} pending={pending} />
          ) : (
            <TryCaptureStep saved={state.saved} />
          )}
          {error !== undefined && error !== null && (
            <p className="onboarding-error" role="alert">
              {error}
            </p>
          )}
        </div>
        {(state !== undefined || error !== undefined) && (
          <OnboardingFooter
            state={state ?? initial}
            pending={pending || preferences.pending}
            recording={recording.snapshot.phase !== 'idle'}
            act={navigate}
          />
        )}
      </main>
    </div>
  );
}
