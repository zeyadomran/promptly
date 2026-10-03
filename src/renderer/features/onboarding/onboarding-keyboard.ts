import type { OnboardingStep } from '../../../shared/contracts/onboarding';
import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import type { LibraryFocus } from '../library/library-keyboard';
import { onboardingBack, onboardingNext } from './onboarding-navigation';

export type OnboardingKeyAction =
  | { kind: 'step'; step: OnboardingStep }
  | { kind: 'finish' }
  | { kind: 'theme'; theme: 'light' | 'dark' | 'system' };
export function onboardingKeyAction(
  input: ShortcutKeyEvent & {
    step: OnboardingStep;
    disabled: boolean;
    prevented: boolean;
    focus: LibraryFocus;
  }
): OnboardingKeyAction | undefined {
  if (
    input.disabled ||
    input.prevented ||
    input.focus !== 'library' ||
    input.repeat ||
    input.isComposing ||
    input.altGraph === true ||
    input.ctrlKey ||
    input.metaKey ||
    input.altKey ||
    input.shiftKey
  )
    return undefined;
  if (input.key === 'Enter') {
    const next = onboardingNext[input.step];

    return next === undefined
      ? input.step === 'done'
        ? { kind: 'finish' }
        : undefined
      : { kind: 'step', step: next };
  }

  if (input.key === 'ArrowLeft') {
    const back = onboardingBack[input.step];

    return back === undefined ? undefined : { kind: 'step', step: back };
  }

  if (input.step === 'preferences' && ['1', '2', '3'].includes(input.key))
    return {
      kind: 'theme',
      theme: input.key === '1' ? 'light' : input.key === '2' ? 'dark' : 'system'
    };
  return undefined;
}
