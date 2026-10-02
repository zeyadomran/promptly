import { ArrowRight } from 'lucide-react';

import type { OnboardingState, OnboardingStep } from '../../../shared/contracts/onboarding';
import { Button } from '../../components/ui/button';

export function OnboardingFooter({
  state,
  pending,
  recording,
  act
}: {
  state: OnboardingState;
  pending: boolean;
  recording: boolean;
  act: (step: OnboardingStep | boolean) => void;
}) {
  return (
    <footer className="onboarding-footer">
      <div>
        {state.step !== 'welcome' && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              act(state.step === 'capture' ? 'shortcut' : 'welcome');
            }}
          >
            Back
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            act(true);
          }}
        >
          Skip
        </Button>
      </div>
      <Button
        disabled={pending || recording || (state.step === 'capture' && !state.saved)}
        onClick={() => {
          act(
            state.step === 'welcome' ? 'shortcut' : state.step === 'shortcut' ? 'capture' : false
          );
        }}
      >
        {pending
          ? 'Saving…'
          : state.step === 'welcome'
            ? 'Get started'
            : state.step === 'shortcut'
              ? 'Continue'
              : 'Open Promptly'}
        <ArrowRight aria-hidden="true" />
      </Button>
    </footer>
  );
}
