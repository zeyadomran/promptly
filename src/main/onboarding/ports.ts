import type { OnboardingDestination, OnboardingState } from '../../shared/contracts/onboarding';
import type { ShortcutTestState } from '../../shared/contracts/shortcut-test';

export interface OnboardingOwner {
  id: number;
  windowHandle: string;
  alive: () => boolean;
  onClose: (listener: () => void) => () => void;
  publish: (state: OnboardingState) => void;
}
export interface OnboardingEffects {
  now: () => number;
  complete: (ownerId: number, destination: OnboardingDestination) => Promise<void>;
  startTest: (ownerId: number, publish: (state: ShortcutTestState) => void) => void;
  stopTest: (ownerId: number) => void;
}
