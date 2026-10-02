import { PinStatus } from '../../components/shared/PinStatus';
import { useLibrary } from '../library/library-context';
import { usePreferences } from '../settings/settings-context';

export function RegularFooter() {
  const { state } = useLibrary();
  const { settings } = usePreferences();

  return (
    <footer className="library-footer regular-footer">
      <div className="regular-keyboard-hints">
        <span>
          <kbd>↑ ↓</kbd> navigate
        </span>
        <span>
          <kbd>Enter</kbd> copy
        </span>
        <span>
          <kbd>{window.promptly.platform === 'darwin' ? '⌘' : 'Ctrl'} T</kbd> tag
        </span>
        <span>
          <kbd>Delete</kbd> remove
        </span>
      </div>
      <div className="regular-footer-status">
        <PinStatus pinned={settings.alwaysOnTop} />
        <span aria-live="polite">
          {state.total} of {state.unfilteredTotal}
        </span>
      </div>
    </footer>
  );
}
