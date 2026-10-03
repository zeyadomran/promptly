import { OnboardingLogo } from './OnboardingLogo';

export function WelcomeStep() {
  return (
    <div className="onboarding-step-body onboarding-splash">
      <OnboardingLogo />
      <h1 tabIndex={-1}>
        Highlight.
        <br />
        Tap tap.
        <br />
        <span>It’s saved.</span>
      </h1>
    </div>
  );
}
