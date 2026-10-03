import { BookOpen } from 'lucide-react';

import type {
  OnboardingDestination,
  OnboardingState,
  OnboardingStep
} from '../../../shared/contracts/onboarding';
import { ShortcutKey } from '../../components/shared/ShortcutKey';
import { Button } from '../../components/ui/button';
import { onboardingBack, onboardingNext } from './onboarding-navigation';

export function OnboardingFooter({
  state,
  pending,
  recording,
  navigate,
  finish
}: {
  state: OnboardingState;
  pending: boolean;
  recording: boolean;
  navigate: (step: OnboardingStep) => void;
  finish: (skip: boolean, destination?: OnboardingDestination) => void;
}) {
  const back = onboardingBack[state.step];
  const next = onboardingNext[state.step];
  const skip = () => {
    if (state.step === 'shortcut' || state.step === 'capture') navigate('preferences');
    else finish(true);
  };

  return (
    <footer className="onboarding-footer">
      <div>
        {back !== undefined && state.step !== 'done' && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              navigate(back);
            }}
          >
            <ShortcutKey>←</ShortcutKey>Back
          </Button>
        )}
        {state.step !== 'done' && (
          <Button variant="ghost" disabled={pending} onClick={skip}>
            {state.step === 'welcome' || state.step === 'guide' ? 'Set up later' : 'Skip'}
          </Button>
        )}
        {state.step === 'done' && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              finish(!state.saved, 'wiki');
            }}
          >
            <BookOpen aria-hidden="true" />
            Read the guide
          </Button>
        )}
      </div>
      {(next !== undefined || state.step === 'done') && (
        <Button
          variant="ghost"
          disabled={pending || recording}
          className="onboarding-continue"
          onClick={() => {
            if (next !== undefined) navigate(next);
            else finish(!state.saved);
          }}
        >
          {pending
            ? 'Saving'
            : state.step === 'welcome'
              ? 'Press to begin'
              : state.step === 'guide'
                ? 'Press to start'
                : state.step === 'done'
                  ? 'Open my library'
                  : 'Continue'}
          <ShortcutKey>Enter ↵</ShortcutKey>
        </Button>
      )}
    </footer>
  );
}
