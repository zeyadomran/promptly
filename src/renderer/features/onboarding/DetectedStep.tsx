import { CircleCheck } from 'lucide-react';

import type { OnboardingState } from '../../../shared/contracts/onboarding';
import type { Settings } from '../../../shared/contracts/settings';
import { saveShortcutLabel } from '../library/save-shortcut-label';
import { OnboardingShortcutKeys } from './OnboardingShortcutKeys';

export function DetectedStep({
  state,
  shortcut
}: {
  state: OnboardingState;
  shortcut: Settings['saveShortcut'];
}) {
  return (
    <div className="onboarding-step-body onboarding-shortcut-test">
      <h1 tabIndex={-1}>Got it.</h1>
      <p className="onboarding-description">
        {saveShortcutLabel(shortcut)} is your capture shortcut.
      </p>
      <OnboardingShortcutKeys shortcut={shortcut} test={state.test} />
      <p className="onboarding-test-status onboarding-detected" role="status">
        <CircleCheck aria-hidden="true" />
        {state.test.elapsedMs === undefined
          ? 'Shortcut detected.'
          : `Detected in ${String(Math.round(state.test.elapsedMs))} ms`}
      </p>
    </div>
  );
}
