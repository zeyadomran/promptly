import { saveShortcutLabel } from '../library/save-shortcut-label';
import { usePreferences } from '../settings/settings-context';

export function WelcomeStep() {
  const { settings } = usePreferences();
  const shortcut = saveShortcutLabel(settings.saveShortcut);

  return (
    <div className="onboarding-step-body">
      <h1 tabIndex={-1}>Save anything with a keystroke</h1>
      <p className="onboarding-description">
        Highlight text in any app, use your shortcut, and find it here when you need it.
      </p>
      <div className="onboarding-welcome-cards">
        <div>
          <span>01</span>
          <strong>Highlight</strong>
          <p>Select a prompt, a command, or a useful passage.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Press {shortcut}</strong>
          <p>Promptly saves your selection, right where you are.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Click to copy</strong>
          <p>Search your library and reuse the exact text.</p>
        </div>
      </div>
    </div>
  );
}
