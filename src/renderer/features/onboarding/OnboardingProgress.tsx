import type { OnboardingStep } from '../../../shared/contracts/onboarding';

export function OnboardingProgress({ step }: { step: OnboardingStep }) {
  if (step === 'welcome' || step === 'guide') return null;
  const completed = step === 'done' ? 4 : step === 'preferences' ? 3 : step === 'capture' ? 2 : 1;

  return (
    <div
      className="onboarding-progress"
      role="progressbar"
      aria-label="Setup progress"
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={completed}
    >
      {[1, 2, 3, 4].map((segment) => (
        <span key={segment} data-complete={segment <= completed} />
      ))}
    </div>
  );
}
