import { useEffect, useRef } from 'react';

import type {
  OnboardingDestination,
  OnboardingState,
  OnboardingStep
} from '../../../shared/contracts/onboarding';
import { usePreferenceMutation } from '../settings/hooks/use-preference-mutation';
import { useShortcutPreferences } from '../shortcuts/hooks/use-shortcut-preferences';
import { useShortcutRecording } from '../shortcuts/hooks/use-shortcut-recording';
import { DetectedStep } from './DetectedStep';
import { DoneStep } from './DoneStep';
import { GuideStep } from './GuideStep';
import { OnboardingFooter } from './OnboardingFooter';
import { OnboardingProgress } from './OnboardingProgress';
import { PreferencesStep } from './PreferencesStep';
import { ShortcutStep } from './ShortcutStep';
import { TryCaptureStep } from './TryCaptureStep';
import { useOnboarding } from './use-onboarding';
import { useOnboardingKeyboard } from './use-onboarding-keyboard';
import { WelcomeStep } from './WelcomeStep';

const initial: OnboardingState = {
  version: 0,
  step: 'welcome',
  saved: false,
  preview: null,
  test: { status: 'inactive' },
  completed: false,
  error: null
};

export function OnboardingWindow() {
  const { state, pending, error, act, finish } = useOnboarding();
  const recording = useShortcutRecording();
  const preferences = useShortcutPreferences();
  const mutation = usePreferenceMutation();
  const content = useRef<HTMLDivElement>(null);
  const previousRecording = useRef(recording.snapshot.phase);
  const binding =
    JSON.stringify(preferences.settings.saveShortcut) +
    String(preferences.settings.doubleTapWindowMs);
  const previousBinding = useRef(binding);
  const restartTest = useRef(false);
  const busy =
    pending || preferences.pending || mutation.pending || recording.snapshot.phase !== 'idle';

  useEffect(() => {
    content.current?.querySelector('h1')?.focus();
  }, [state?.step]);
  useEffect(() => {
    if (
      previousBinding.current !== binding ||
      (previousRecording.current !== 'idle' && recording.snapshot.phase === 'idle')
    )
      restartTest.current = true;
    previousBinding.current = binding;
    previousRecording.current = recording.snapshot.phase;
    if (state?.step !== 'shortcut') restartTest.current = false;
    if (
      state?.step === 'shortcut' &&
      restartTest.current &&
      !pending &&
      !preferences.pending &&
      recording.snapshot.phase === 'idle'
    ) {
      restartTest.current = false;
      void act('shortcut');
    }
  }, [binding, state?.step, pending, preferences.pending, recording.snapshot.phase, act]);

  const navigate = (next: OnboardingStep) => {
    void recording.session.cancel().then(() => act(next));
  };

  const complete = (skip: boolean, destination: OnboardingDestination = 'library') => {
    void recording.session.cancel().then(() => finish(skip, destination));
  };

  useOnboardingKeyboard({
    step: state?.step,
    disabled: busy,
    navigate,
    finish: () => {
      complete(!(state?.saved ?? false));
    },
    theme: (theme) => {
      void mutation.apply({ theme });
    }
  });
  return (
    <div className="onboarding-window" data-step={state?.step ?? 'welcome'}>
      <OnboardingProgress step={state?.step ?? 'welcome'} />
      <main className="onboarding-main">
        <div className="onboarding-content" ref={content} aria-busy={busy}>
          {state === undefined ? (
            <p role="status">Loading setup…</p>
          ) : state.step === 'welcome' ? (
            <WelcomeStep />
          ) : state.step === 'guide' ? (
            <GuideStep />
          ) : state.step === 'shortcut' ? (
            <ShortcutStep
              state={state}
              recording={recording}
              preferences={preferences}
              pending={pending}
              retry={() => {
                navigate('shortcut');
              }}
            />
          ) : state.step === 'detected' ? (
            <DetectedStep state={state} shortcut={preferences.settings.saveShortcut} />
          ) : state.step === 'capture' ? (
            <TryCaptureStep />
          ) : state.step === 'preferences' ? (
            <PreferencesStep mutation={mutation} />
          ) : (
            <DoneStep state={state} />
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
            pending={
              pending ||
              preferences.pending ||
              mutation.pending ||
              recording.snapshot.phase === 'saving'
            }
            recording={recording.snapshot.phase !== 'idle'}
            navigate={navigate}
            finish={complete}
          />
        )}
      </main>
    </div>
  );
}
