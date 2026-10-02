import { Check } from 'lucide-react';

import type { OnboardingStep } from '../../../shared/contracts/onboarding';
import { Logo } from '../../components/shared/Logo';

const steps = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'shortcut', label: 'Choose a shortcut' },
  { id: 'capture', label: 'Try it once' }
] as const;

export function OnboardingStepper({ step }: { step: OnboardingStep }) {
  const current = steps.findIndex((item) => item.id === step);

  return (
    <aside className="onboarding-stepper" aria-label="Setup progress">
      <div className="onboarding-brand">
        <Logo wordmark />
      </div>
      <ol>
        {steps.map((item, index) => (
          <li
            key={item.id}
            aria-current={item.id === step ? 'step' : undefined}
            data-complete={index < current}
          >
            <span className="onboarding-step-number" aria-hidden="true">
              {index < current ? <Check /> : index + 1}
            </span>
            {item.label}
          </li>
        ))}
      </ol>
      <p>Your prompts, a keystroke away.</p>
    </aside>
  );
}
