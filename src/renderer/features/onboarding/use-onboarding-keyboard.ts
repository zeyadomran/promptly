import { useEffect } from 'react';

import type { OnboardingStep } from '../../../shared/contracts/onboarding';
import { keyboardFocus } from '../library/keyboard-focus';
import { onboardingKeyAction } from './onboarding-keyboard';

export function useOnboardingKeyboard({
  step,
  disabled,
  navigate,
  finish,
  theme
}: {
  step: OnboardingStep | undefined;
  disabled: boolean;
  navigate: (step: OnboardingStep) => void;
  finish: () => void;
  theme: (theme: 'light' | 'dark' | 'system') => void;
}) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (step === undefined) return;
      const action = onboardingKeyAction({
        step,
        disabled,
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        altGraph: event.getModifierState('AltGraph'),
        repeat: event.repeat,
        isComposing: event.isComposing,
        prevented: event.defaultPrevented,
        focus: keyboardFocus(event)
      });
      if (action === undefined) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (action.kind === 'step') navigate(action.step);
      else if (action.kind === 'finish') finish();
      else theme(action.theme);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [disabled, step, navigate, finish, theme]);
}
