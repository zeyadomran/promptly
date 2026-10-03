import { saveShortcutLabel } from '../library/save-shortcut-label';
import { usePreferences } from '../settings/settings-context';
import { useShortcutStatus } from '../shortcuts/hooks/use-shortcut-status';

const sample =
  'Read the failing tests first. Explain the root cause in two sentences, then propose the smallest fix.';

export function TryCaptureStep() {
  const preferences = usePreferences();
  const status = useShortcutStatus(preferences.revision, 'idle');
  const unavailable =
    status !== undefined &&
    (status.capture !== 'registered' || status.capturePaused || !status.captureHandlerAvailable);

  return (
    <div className="onboarding-step-body">
      <h1 tabIndex={-1}>Now save something.</h1>
      <p className="onboarding-description">
        Select the prompt, then {saveShortcutLabel(preferences.settings.saveShortcut)}.
      </p>
      <div className="onboarding-terminal">
        <div aria-hidden="true">
          <span>~/acme-api</span> ❯ claude
        </div>
        <p aria-hidden="true">Ready. What should we work on?</p>
        <textarea
          readOnly
          value={sample}
          aria-label="Practice prompt — select this text to capture it"
          spellCheck={false}
        />
      </div>
      <p className="onboarding-practice-status" role="status" aria-live="polite">
        <span className="onboarding-wait-dot" aria-hidden="true" />
        {unavailable
          ? 'Your capture listener is unavailable or paused. Go Back to change your shortcut, or choose Skip.'
          : 'Waiting for your capture…'}
      </p>
    </div>
  );
}
