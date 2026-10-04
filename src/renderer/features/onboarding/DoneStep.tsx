import type { OnboardingState } from '../../../shared/contracts/onboarding';
import { usePreferences } from '../settings/settings-context';
import { ShortcutKeycaps } from '../shortcuts/components/ShortcutKeycaps';

export function DoneStep({ state }: { state: OnboardingState }) {
  const preferences = usePreferences();

  return (
    <div className="onboarding-step-body">
      <h1 tabIndex={-1}>That’s it.</h1>
      <p className="onboarding-description">
        {state.preview === null
          ? 'Setup is ready. Save your first snippet whenever you’re ready.'
          : 'Your first snippet is in the library.'}{' '}
        Press{' '}
        <ShortcutKeycaps
          accelerator={preferences.settings.openShortcut}
          platform={window.promptly.platform}
        />{' '}
        whenever you need it.
      </p>
      {state.preview !== null && (
        <div className="onboarding-saved-preview">
          <p>{state.preview.text}</p>
          <span>
            Saved{state.preview.sourceApp === null ? '' : ` · ${state.preview.sourceApp}`}
          </span>
        </div>
      )}
    </div>
  );
}
