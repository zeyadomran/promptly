import type { OnboardingState } from '../../shared/contracts/onboarding';

export interface OnboardingOwner {
  id: number;
  windowHandle: string;
  alive: () => boolean;
  onClose: (listener: () => void) => () => void;
  publish: (state: OnboardingState) => void;
}
export interface OnboardingEffects {
  now: () => number;
  openCompact: (ownerId: number) => Promise<void>;
}
