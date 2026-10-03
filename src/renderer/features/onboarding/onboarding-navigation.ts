import type { OnboardingStep } from '../../../shared/contracts/onboarding';

export const onboardingNext: Partial<Record<OnboardingStep, OnboardingStep>> = {
  welcome: 'guide',
  guide: 'shortcut',
  detected: 'capture',
  preferences: 'done'
};
export const onboardingBack: Partial<Record<OnboardingStep, OnboardingStep>> = {
  guide: 'welcome',
  shortcut: 'guide',
  detected: 'shortcut',
  capture: 'shortcut',
  preferences: 'capture',
  done: 'preferences'
};
